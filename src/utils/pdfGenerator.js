import jsPDF from 'jspdf';
import { getTranslation } from '../config/translations';

export const generatePDF = (classInfo, students = []) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297
  
  // Paramètres de la grille (2 colonnes, 4 lignes)
  const columns = 2;
  const rows = 4;
  const cardsPerPage = columns * rows;
  const marginX = 15;
  const marginY = 15;
  const gapX = 10;
  const gapY = 10;
  
  const cardWidth = (pageWidth - 2 * marginX - (columns - 1) * gapX) / columns;
  const cardHeight = (pageHeight - 2 * marginY - (rows - 1) * gapY) / rows;
  
  students.forEach((student, index) => {
    // Si la page est pleine, créer une nouvelle page
    if (index > 0 && index % cardsPerPage === 0) {
      doc.addPage();
    }
    
    // Calculer la position X et Y de la carte courante
    const positionOnPage = index % cardsPerPage;
    const colNumber = positionOnPage % columns;
    const rowNumber = Math.floor(positionOnPage / columns);
    
    const x = marginX + colNumber * (cardWidth + gapX);
    const y = marginY + rowNumber * (cardHeight + gapY);
    
    // 1. Fond beige de la carte
    doc.setFillColor(250, 248, 245);
    doc.rect(x, y, cardWidth, cardHeight, 'F');
    
    // 2. Bordure en pointillés continus pour aider à la découpe
    doc.setLineDash([2, 2], 0); // pointillé de 2mm, espace de 2mm
    doc.setLineWidth(0.3);
    doc.setDrawColor(196, 165, 116); // Beige foncé
    doc.rect(x, y, cardWidth, cardHeight, 'S');
    doc.setLineDash([], 0); // resetButton pointillé
    
    // 3. En-tête : Nom de la classe et style "Harry Potter"
    doc.setFont('times', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(139, 111, 71);
    doc.text(`Classe : ${classInfo.name}`, x + cardWidth / 2, y + 8, { align: 'center' });
    
    // Ligne séparatrice
    doc.setLineWidth(0.5);
    doc.setDrawColor(212, 165, 116);
    doc.line(x + 10, y + 11, x + cardWidth - 10, y + 11);
    
    // 4. Nom de l'élève
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(101, 67, 33);
    const fullName = `${student.firstName || ''} ${student.lastName || student.name || ''}`;
    doc.text(fullName, x + cardWidth / 2, y + 20, { align: 'center' });
    
    // 5. Maison (Bande colorée ou badge)
    const houseName = classInfo.houseNames?.[student.house] || '';
    const houseColorHex = classInfo.houseColors?.[student.house] || '#D4A574';
    
    // Convertir hex en RVB pour jsPDF
    const r = parseInt(houseColorHex.slice(1, 3), 16) || 212;
    const g = parseInt(houseColorHex.slice(3, 5), 16) || 165;
    const b = parseInt(houseColorHex.slice(5, 7), 16) || 116;
    
    // Rectangle badge
    doc.setFillColor(r, g, b);
    doc.roundedRect(x + cardWidth / 2 - 20, y + 23, 40, 7, 3, 3, 'F');
    
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    // Texte en blanc sur la couleur de la maison pour le contraste
    doc.setTextColor(255, 255, 255);
    doc.text(houseName, x + cardWidth / 2, y + 28, { align: 'center' });
    
    // 6. Identifiants
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(101, 67, 33);
    doc.text(`Identifiant : ${student.username || ''}`, x + 10, y + 42);
    
    doc.setFont('Helvetica', 'bold');
    doc.text(`Mot de passe : ${student.password || ''}`, x + 10, y + 50);
  });
  
  // Sauvegarder le PDF
  doc.save(`${classInfo.name}-Cartes.pdf`);
};
