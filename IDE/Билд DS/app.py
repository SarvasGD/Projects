"""
Streamlit-консоль для создания ИИ-экспертов
(c) 2025. Все права защищены.

Основные функции:
- Генерация системного промпта и плана тем по роли/задаче/уровню
- Автоматический сбор и парсинг веб-источников через Google Custom Search
- RAG на облачной векторной базе Qdrant (эмбеддинги через GigaChat Embeddings API)
- Генерация «Ядра знаний» в формате docx
- Инкрементное пополнение базы новыми источниками
- Чат с экспертом на основе RAG

Используемые API:
- GigaChat API (чат + эмбеддинги) — бесплатный тариф, работает в РФ
- Google Custom Search JSON API — бесплатные 100 запросов/день
- Qdrant Cloud — бесплатный тир 1 ГБ

Автор: ИИ-ассистент (DeepSeek)
"""

import streamlit as st
import requests
import json
import uuid
import os
import tempfile
import time
from typing import List, Dict, Any, Optional
from pathlib import Path
import trafilatura
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from docx import Document
import subprocess
import sys
import concurrent.futures

# ========== КОНФИГУРАЦИЯ: замените на свои ключи ==========
GIGACHAT_AUTH_KEY = "ваш_ключ_авторизации_gigachat"  # из кабинета developers.sber.ru (Authorization key)
GOOGLE_API_KEY = "ваш_google_api_key"               # Cloud Console -> APIs & Services
GOOGLE_CX = "ваш_search_engine_id"                  # Custom Search Engine ID
QDRANT_CLUSTER_URL = "ваш_qdrant_url"               # например, https://xxx.cloud.qdrant.io:6333
QDRANT_API_KEY = "ваш_qdrant_api_key"               # API key из Qdrant Cloud
# ============================================================

# Инициализация Qdrant
qdrant_client = QdrantClient(url=QDRANT_CLUSTER_URL, api_key=QDRANT_API_KEY)
COLLECTION_NAME = "knowledge_cores"

# Размерность векторов GigaChat Embeddings (модель Embeddings или Embeddings-2)
EMBEDDING_DIM = 1024  # для GigaChat Embeddings, для GigaR может быть другой

# Проверяем или создаём коллекцию
try:
    qdrant_client.get_collection(COLLECTION_NAME)
except Exception:
    qdrant_client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE)
    )

# ========== УТИЛИТЫ GigaChat API ==========
def get_gigachat_token() -> str:
    """
    Получает временный access_token через OAuth2.
    Токен живёт около 30 минут.
    """
    url = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth"
    headers = {
        "Authorization": f"Basic {GIGACHAT_AUTH_KEY}",
        "RqUID": str(uuid.uuid4()),
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
    }
    data = {"scope": "GIGACHAT_API_PERS"}
    
    # Пытаемся без сертификата, если не в production
    try:
        resp = requests.post(url, headers=headers, data=data, timeout=15)
    except requests.exceptions.SSLError:
        # Если ошибка SSL, пробуем с verify=False (небезопасно, но для локального прототипа допустимо)
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        resp = requests.post(url, headers=headers, data=data, verify=False, timeout=15)
    
    resp.raise_for_status()
    return resp.json()["access_token"]

def gigachat_chat(system_prompt: str, user_prompt: str, token: str, temperature: float = 0.7, max_tokens: int = 4000) -> str:
    """
    Отправка запроса в GigaChat Chat Completions API.
    """
    url = "https://gigachat.devices.sberbank.ru/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": user_prompt})
    
    payload = {
        "model": "GigaChat",
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=30)
    except requests.exceptions.SSLError:
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        resp = requests.post(url, headers=headers, json=payload, verify=False, timeout=30)
    
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"]

def gigachat_embeddings(texts: List[str], token: str) -> List[List[float]]:
    """
    Получение эмбеддингов через GigaChat Embeddings API.
    Поддерживает модели: Embeddings, Embeddings-2, EmbeddingsGigaR.
    """
    url = "https://gigachat.devices.sberbank.ru/api/v1/embeddings"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "Embeddings",  # или "Embeddings-2", "EmbeddingsGigaR"
        "input": texts
    }
    
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=30)
    except requests.exceptions.SSLError:
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        resp = requests.post(url, headers=headers, json=payload, verify=False, timeout=30)
    
    resp.raise_for_status()
    data = resp.json()
    # Сортируем по индексу, чтобы порядок векторов соответствовал порядку входных текстов
    embeddings = [None] * len(texts)
    for item in data["data"]:
        idx = item["index"]
        embeddings[idx] = item["embedding"]
    return embeddings

# ========== УТИЛИТЫ Google Custom Search ==========
def google_search(query: str, num: int = 5) -> List[str]:
    """Возвращает список URL из Google Custom Search."""
    url = "https://www.googleapis.com/customsearch/v1"
    params = {
        "key": GOOGLE_API_KEY,
        "cx": GOOGLE_CX,
        "q": query,
        "num": min(num, 10)
    }
    try:
        resp = requests.get(url, params=params, timeout=10)
        if resp.status_code != 200:
            st.warning(f"Google Search error: {resp.status_code}")
            return []
        items = resp.json().get("items", [])
        return [item["link"] for item in items if "link" in item]
    except Exception as e:
        st.warning(f"Google Search exception: {e}")
        return []

def extract_text_from_url(url: str) -> str:
    """Скачивает и извлекает чистый текст со страницы."""
    try:
        downloaded = trafilatura.fetch_url(url)
        if downloaded:
            text = trafilatura.extract(downloaded, include_comments=False, include_tables=True, no_fallback=False)
            return text or ""
    except Exception:
        pass
    return ""

# ========== РАБОТА С ДОКУМЕНТАМИ ==========
def chunk_text(text: str, chunk_size: int = 800, overlap: int = 80) -> List[str]:
    """
    Разбивает текст на чанки указанного размера с перекрытием.
    Размеры оптимизированы под эмбеддинги GigaChat.
    """
    if not text.strip():
        return []
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        if chunk:
            chunks.append(chunk)
        start += chunk_size - overlap
    return chunks

def index_to_qdrant(project: str, texts: List[str], sources: List[str], token: str):
    """
    Индексирует список текстов в Qdrant с метаданными проекта.
    Использует GigaChat Embeddings API.
    """
    if not texts:
        return
    
    # Разбиваем большие тексты на чанки
    all_chunks = []
    all_sources = []
    for text, source in zip(texts, sources):
        chunks = chunk_text(text)
        all_chunks.extend(chunks)
        all_sources.extend([source] * len(chunks))
    
    # Получаем эмбеддинги пачками по 20 текстов (ограничение API)
    BATCH_SIZE = 20
    all_embeddings = []
    
    progress = st.progress(0.0, "Получение эмбеддингов...")
    for i in range(0, len(all_chunks), BATCH_SIZE):
        batch = all_chunks[i:i+BATCH_SIZE]
        try:
            embeddings = gigachat_embeddings(batch, token)
            all_embeddings.extend(embeddings)
        except Exception as e:
            st.error(f"Ошибка при получении эмбеддингов: {e}")
            raise
        progress.progress(min(1.0, (i + BATCH_SIZE) / len(all_chunks)))
    progress.empty()
    
    # Загружаем в Qdrant
    points = []
    for idx, (text, emb, src) in enumerate(zip(all_chunks, all_embeddings, all_sources)):
        point_id = str(uuid.uuid4())
        points.append(PointStruct(
            id=point_id,
            vector=emb,
            payload={"project": project, "text": text, "source": src}
        ))
    
    # Отправляем пачками по 100
    for i in range(0, len(points), 100):
        batch = points[i:i+100]
        qdrant_client.upsert(collection_name=COLLECTION_NAME, points=batch)
    
    return len(all_chunks)

def search_in_qdrant(project: str, query: str, token: str, top_k: int = 3) -> List[Dict[str, Any]]:
    """
    Поиск по векторной БД с фильтром по проекту.
    Использует GigaChat Embeddings API для запроса.
    """
    # Получаем эмбеддинг запроса
    query_embedding = gigachat_embeddings([query], token)[0]
    
    # Ищем ближайшие
    results = qdrant_client.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_embedding,
        query_filter={"must": [{"key": "project", "match": {"value": project}}]},
        limit=top_k
    )
    
    return [
        {"text": hit.payload["text"], "source": hit.payload.get("source", "неизвестно"), "score": hit.score}
        for hit in results
    ]

# ========== ГЕНЕРАЦИЯ ПЛАНА ==========
def generate_plan(role: str, task: str, level: str, token: str) -> Dict[str, Any]:
    """
    Генерирует системный промпт и список тем для будущего эксперта.
    """
    system_prompt = "Ты — архитектор ИИ-экспертов. Твоя задача — создавать структурированные планы для баз знаний. Отвечай строго в формате JSON без дополнительного текста."
    
    user_prompt = f"""
Создай план для ИИ-эксперта по следующей роли и задаче:
Роль: {role}
Задача: {task}
Уровень: {level}
Ответ должен быть в формате JSON с полями:
- "system_prompt": строка — идеальный системный промпт для RAG-ассистента.
- "topics": массив строк из 5-10 ключевых тем, которые нужно включить в ядро знаний.
    """
    
    response = gigachat_chat(system_prompt, user_prompt, token, temperature=0.7)
    
    # Пытаемся извлечь JSON из ответа
    try:
        # Найдём первую { и последнюю }
        start = response.find('{')
        end = response.rfind('}') + 1
        if start != -1 and end != 0:
            json_str = response[start:end]
            return json.loads(json_str)
    except Exception as e:
        st.error(f"Не удалось распарсить JSON от GigaChat. Попробуйте ещё раз. Ответ: {response[:500]}...")
    
    return {"system_prompt": "", "topics": []}

# ========== ЧТЕНИЕ ФАЙЛОВ ==========
def read_pdf(file) -> str:
    """Извлекает текст из PDF файла."""
    try:
        import PyPDF2
        pdf_reader = PyPDF2.PdfReader(file)
        return "\n".join([page.extract_text() or "" for page in pdf_reader.pages])
    except Exception as e:
        st.warning(f"Ошибка чтения PDF: {e}")
        return ""

def read_docx(file) -> str:
    """Извлекает текст из DOCX файла."""
    try:
        import docx
        doc = docx.Document(file)
        return "\n".join([p.text for p in doc.paragraphs])
    except Exception as e:
        st.warning(f"Ошибка чтения DOCX: {e}")
        return ""

def read_txt(file) -> str:
    """Извлекает текст из TXT файла."""
    try:
        return str(file.read(), "utf-8")
    except Exception as e:
        st.warning(f"Ошибка чтения TXT: {e}")
        return ""

# ========== ОСНОВНОЙ ИНТЕРФЕЙС ==========
st.set_page_config(
    page_title="Конвейер ИИ-экспертов",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.title("🧠 Конвейер создания ИИ-экспертов")
st.markdown("Создавайте базы знаний, общайтесь с экспертами, пополняйте источники — всё в одном месте.")

# ========== БОКОВАЯ ПАНЕЛЬ ==========
st.sidebar.header("⚙️ Настройки")

# Проверка ключей
if GIGACHAT_AUTH_KEY.startswith("ваш") or GOOGLE_API_KEY.startswith("ваш") or GOOGLE_CX.startswith("ваш") or QDRANT_CLUSTER_URL.startswith("ваш"):
    st.sidebar.error("⚠️ Замените заглушки на реальные ключи API в коде!")

# Проект
project_name = st.sidebar.text_input("🏷️ Имя проекта", value="math_expert",
                                    help="Уникальное имя для базы знаний. Можно использовать разные имена для разных проектов.")

# Получение токена
if "gigachat_token" not in st.session_state or "token_expiry" not in st.session_state or time.time() > st.session_state.token_expiry:
    try:
        with st.spinner("Авторизация в GigaChat..."):
            st.session_state.gigachat_token = get_gigachat_token()
            st.session_state.token_expiry = time.time() + 25 * 60  # обновим за 5 минут до истечения
        st.sidebar.success("✅ Подключено к GigaChat")
    except Exception as e:
        st.sidebar.error(f"❌ Ошибка авторизации: {e}")
        st.stop()

# ========== ВКЛАДКИ ==========
tab1, tab2, tab3 = st.tabs(["📋 Создание эксперта", "💬 Чат с экспертом", "📚 Пополнение базы"])

with tab1:
    st.header("Создание нового эксперта")
    st.markdown("Заполните поля, чтобы сгенерировать промпт и собрать базу знаний.")
    
    col1, col2 = st.columns(2)
    
    with col1:
        role = st.text_area("🎭 Роль эксперта",
                           value="Математик-исследователь мирового уровня",
                           help="Кем будет ваш эксперт? Например: 'Эксперт по SEO', 'Юрист по авторскому праву'")
    
    with col2:
        task = st.text_area("🎯 Задача эксперта",
                           value="Создать исчерпывающую базу знаний по проблемам тысячелетия для продуктивной научной работы",
                           help="Какую конкретную задачу решает эксперт?")
    
    level = st.selectbox("📚 Уровень детализации",
                        ["Новичок", "Продвинутый", "Эксперт"],
                        index=2,
                        help="Новичок — с пояснениями и аналогиями, Эксперт — только суть, без базовых объяснений")
    
    # Генерация плана
    if st.button("✨ Сгенерировать план", type="primary", use_container_width=True):
        with st.spinner("GigaChat создаёт структуру эксперта..."):
            plan = generate_plan(role, task, level, st.session_state.gigachat_token)
            st.session_state['plan'] = plan
            st.session_state['role'] = role
            st.session_state['task'] = task
            st.session_state['level'] = level
        st.success("План готов! Промпт и темы созданы.")
    
    # Показываем план и даём возможность редактировать
    if 'plan' in st.session_state:
        st.divider()
        plan = st.session_state['plan']
        
        st.subheader("📝 Системный промпт")
        system_prompt = st.text_area("System Prompt (можно редактировать)",
                                    value=plan.get('system_prompt', ''),
                                    height=150)
        
        st.subheader("🔍 Темы для сбора данных")
        topics_text = st.text_area("Темы (каждая с новой строки, можно редактировать)",
                                  value="\n".join(plan.get('topics', [])),
                                  height=150)
        topics_list = [t.strip() for t in topics_text.split('\n') if t.strip()]
        
        st.subheader("🔗 Дополнительные ссылки (опционально)")
        custom_urls = st.text_area("По одной ссылке на строку",
                                  placeholder="https://example.com/article1\nhttps://example.com/article2",
                                  height=100)
        custom_urls_list = [u.strip() for u in custom_urls.split('\n') if u.strip()]
        
        st.subheader("📎 Загрузить свои файлы (PDF, DOCX, TXT)")
        uploaded_files = st.file_uploader("Выберите файлы", type=["pdf", "docx", "txt"], accept_multiple_files=True)
        
        if st.button("🚀 Собрать ядро знаний", type="primary", use_container_width=True):
            all_texts = []
            all_sources = []
            
            progress_bar = st.progress(0.0, "Сбор источников...")
            
            # 1. Поиск по темам
            total_topics = len(topics_list)
            for idx, topic in enumerate(topics_list):
                st.info(f"🔎 Ищу информацию по теме: {topic}")
                urls = google_search(topic, num=3)
                
                for url in urls:
                    text = extract_text_from_url(url)
                    if text and len(text) > 100:  # минимум 100 символов
                        all_texts.append(text)
                        all_sources.append(url)
                
                progress_bar.progress((idx + 1) / (total_topics + len(custom_urls_list) + (1 if uploaded_files else 0)))
            
            # 2. Пользовательские ссылки
            for idx, url in enumerate(custom_urls_list):
                st.info(f"🔗 Обрабатываю ссылку: {url}")
                text = extract_text_from_url(url)
                if text and len(text) > 100:
                    all_texts.append(text)
                    all_sources.append(url)
                progress_bar.progress((total_topics + idx + 1) / (total_topics + len(custom_urls_list) + (1 if uploaded_files else 0)))
            
            # 3. Загруженные файлы
            if uploaded_files:
                for idx, file in enumerate(uploaded_files):
                    st.info(f"📄 Читаю файл: {file.name}")
                    content = ""
                    if file.type == "application/pdf":
                        content = read_pdf(file)
                    elif file.type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                        content = read_docx(file)
                    else:
                        content = read_txt(file)
                    
                    if content:
                        all_texts.append(content)
                        all_sources.append(f"file:{file.name}")
            
            progress_bar.progress(1.0)
            progress_bar.empty()
            
            # Индексация в Qdrant
            if all_texts:
                st.info(f"📊 Индексация {len(all_texts)} документов в Qdrant...")
                try:
                    chunks_count = index_to_qdrant(project_name, all_texts, all_sources, st.session_state.gigachat_token)
                    st.success(f"✅ База знаний загружена: {chunks_count} чанков индексировано.")
                    
                    # Генерация ядра знаний для человека
                    st.info("📝 Генерирую «Ядро знаний»...")
                    
                    # Берём первые несколько текстов для контекста
                    combined = "\n\n---\n\n".join(all_texts[:5])
                    summary_prompt = f"Создай подробное структурированное «Ядро знаний» по роли '{st.session_state['role']}'.\nЗадача: {st.session_state['task']}\nУровень: {st.session_state['level']}\nМатериалы:\n{combined[:10000]}"
                    
                    summary = gigachat_chat(
                        system_prompt="Ты — эксперт-составитель образовательных материалов. Отвечаешь на русском языке.",
                        user_prompt=summary_prompt,
                        token=st.session_state.gigachat_token,
                        temperature=0.4,
                        max_tokens=8000
                    )
                    
                    # Сохраняем в сессию и предлагаем скачать
                    st.session_state['article'] = summary
                    
                    # Создаём docx
                    doc = Document()
                    doc.add_heading(f"Ядро знаний: {st.session_state['role']}", 0)
                    for paragraph in summary.split('\n'):
                        if paragraph.strip():
                            doc.add_paragraph(paragraph.strip())
                    
                    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".docx")
                    doc.save(temp_file.name)
                    st.session_state['docx_path'] = temp_file.name
                    
                    col1, col2 = st.columns(2)
                    with col1:
                        st.download_button(
                            "📥 Скачать Ядро знаний (.docx)",
                            data=open(temp_file.name, 'rb'),
                            file_name=f"{project_name}_core.docx",
                            use_container_width=True
                        )
                    with col2:
                        if st.button("📂 Открыть в Word", use_container_width=True):
                            try:
                                os.startfile(temp_file.name)
                            except:
                                pass
                    
                    st.success("🎉 Эксперт готов! Переходите на вкладку «Чат» для вопросов.")
                    
                except Exception as e:
                    st.error(f"❌ Ошибка при индексации: {e}")
            else:
                st.error("❌ Не удалось собрать ни одного текста. Проверьте подключение и API-ключи.")

with tab2:
    st.header("💬 Чат с экспертом")
    st.markdown("Задавайте вопросы по загруженной базе знаний.")
    
    if not project_name:
        st.warning("Введите имя проекта в боковой панели.")
        st.stop()
    
    # Проверяем, есть ли данные
    try:
        count = qdrant_client.count(
            collection_name=COLLECTION_NAME,
            count_filter={"must": [{"key": "project", "match": {"value": project_name}}]}
        )
        has_data = count.count > 0
    except Exception:
        has_data = False
    
    if not has_data:
        st.warning("База знаний пуста. Сначала создайте эксперта на вкладке «Создание».")
        st.stop()
    
    # Интерфейс чата
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []
    
    # Показываем историю
    for msg in st.session_state.chat_history:
        with st.chat_message(msg["role"]):
            st.write(msg["content"])
            if "sources" in msg:
                with st.expander("📚 Источники"):
                    for src in msg["sources"]:
                        st.write(f"- {src['source']} (релевантность: {src['score']:.2f})")
    
    # Поле ввода
    if prompt := st.chat_input("Задайте вопрос эксперту..."):
        # Добавляем вопрос пользователя
        st.session_state.chat_history.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.write(prompt)
        
        # Ищем в базе
        with st.spinner("Поиск в базе знаний..."):
            try:
                contexts = search_in_qdrant(project_name, prompt, st.session_state.gigachat_token, top_k=3)
            except Exception as e:
                st.error(f"Ошибка поиска: {e}")
                contexts = []
        
        # Генерируем ответ
        if contexts:
            context_text = "\n\n---\n\n".join([c["text"] for c in contexts])
            full_prompt = f"Контекст из базы знаний:\n{context_text}\n\nВопрос пользователя: {prompt}\n\nОтветь как эксперт, опираясь только на контекст. Если информации недостаточно, укажи это."
        else:
            full_prompt = prompt
        
        with st.spinner("Эксперт думает..."):
            try:
                # Получаем системный промпт из плана, если есть
                system = st.session_state.get('plan', {}).get('system_prompt', "Ты — эксперт. Отвечай строго по контексту.")
                answer = gigachat_chat(system, full_prompt, st.session_state.gigachat_token)
            except Exception as e:
                answer = f"Ошибка при запросе к GigaChat: {e}"
        
        # Добавляем ответ
        st.session_state.chat_history.append({
            "role": "assistant",
            "content": answer,
            "sources": [{"source": c["source"], "score": c["score"]} for c in contexts]
        })
        with st.chat_message("assistant"):
            st.write(answer)
            if contexts:
                with st.expander("📚 Использованные источники"):
                    for c in contexts:
                        st.write(f"- {c['source']} (релевантность: {c['score']:.2f})")
        
        # Очищаем поле ввода (автоматически)

with tab3:
    st.header("📚 Пополнение базы знаний")
    st.markdown("Добавьте новые источники к существующей базе знаний.")
    
    if not project_name:
        st.warning("Введите имя проекта в боковой панели.")
        st.stop()
    
    # Новые ссылки
    st.subheader("🔗 Добавить ссылки")
    new_urls = st.text_area("По одной ссылке на строку",
                           placeholder="https://example.com/new-article",
                           height=100)
    new_urls_list = [u.strip() for u in new_urls.split('\n') if u.strip()]
    
    # Новые файлы
    st.subheader("📎 Загрузить файлы")
    new_files = st.file_uploader("Выберите файлы", type=["pdf", "docx", "txt"], accept_multiple_files=True,
                                key="new_files_uploader")
    
    if st.button("➕ Добавить в базу знаний", use_container_width=True):
        all_texts = []
        all_sources = []
        
        # Обработка ссылок
        for url in new_urls_list:
            text = extract_text_from_url(url)
            if text and len(text) > 100:
                all_texts.append(text)
                all_sources.append(url)
        
        # Обработка файлов
        if new_files:
            for file in new_files:
                content = ""
                if file.type == "application/pdf":
                    content = read_pdf(file)
                elif file.type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                    content = read_docx(file)
                else:
                    content = read_txt(file)
                
                if content:
                    all_texts.append(content)
                    all_sources.append(f"file:{file.name}")
        
        if all_texts:
            try:
                chunks_count = index_to_qdrant(project_name, all_texts, all_sources, st.session_state.gigachat_token)
                st.success(f"✅ Добавлено {chunks_count} чанков в базу знаний «{project_name}».")
            except Exception as e:
                st.error(f"❌ Ошибка: {e}")
        else:
            st.warning("Не удалось извлечь текст из указанных источников.")
    
    # Статистика
    st.divider()
    st.subheader("📊 Статистика базы знаний")
    try:
        count = qdrant_client.count(
            collection_name=COLLECTION_NAME,
            count_filter={"must": [{"key": "project", "match": {"value": project_name}}]}
        )
        st.metric("Всего чанков в базе", count.count)
    except Exception:
        st.info("Нет данных о базе знаний.")
