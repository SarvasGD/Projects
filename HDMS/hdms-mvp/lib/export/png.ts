/**

- Export an HTML element as a PNG file using html2canvas.
- Lazy-loads the library on first call.
*/
export async function exportElementAsPNG(
elementId: string,
filename: string
): Promise<void> {
const el = document.getElementById(elementId);
if (!el) throw new Error(`Элемент #${elementId} не найден`);

const html2canvas = (await import("html2canvas")).default;
const canvas = await html2canvas(el, {
backgroundColor: "#0a0e14",
scale: 2,
useCORS: true,
logging: false
});

const dataUrl = canvas.toDataURL("image/png");
const link = document.createElement("a");
link.href = dataUrl;
link.download = filename;
link.click();
}