
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportToPdf = async (elementId: string, fileName: string): Promise<void> => {
  const input = document.getElementById(elementId);
  if (!input) {
    console.error(`Element with id ${elementId} not found.`);
    alert(`Error: Element with id ${elementId} not found for PDF generation.`);
    return;
  }

  // Temporarily make sure the element is fully visible if it's styled to be hidden or scaled for preview
  // This is a common pattern, but depends on specific CSS. For simplicity, we assume it's renderable.
  
  try {
    const canvas = await html2canvas(input, {
      scale: 2, // Improve quality
      useCORS: true, // If images are from other origins
      logging: false,
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt', // points, matches html2canvas dimensions well
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // Calculate the aspect ratio
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    
    // Calculate the new dimensions for the image on the PDF
    const newImgWidth = imgWidth * ratio;
    const newImgHeight = imgHeight * ratio;

    // Calculate position to center the image (optional)
    const x = (pdfWidth - newImgWidth) / 2;
    const y = 0; // Or (pdfHeight - newImgHeight) / 2 for vertical centering

    pdf.addImage(imgData, 'PNG', x, y, newImgWidth, newImgHeight);
    pdf.save(`${fileName}.pdf`);
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("An error occurred while generating the PDF. Please check the console for details.");
  }
};
    