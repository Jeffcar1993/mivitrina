import multer from 'multer';

// Usamos memoryStorage para no guardar archivos físicos en el servidor, 
// sino pasarlos directamente a la nube (Cloudinary).
const storage = multer.memoryStorage();

export const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // Límite opcional de 5MB
});