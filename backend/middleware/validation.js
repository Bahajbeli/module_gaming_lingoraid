const { z } = require('zod');

// Schéma de connexion
const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis')
});

// Schéma de cours
const courseSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  description: z.string().min(1, 'La description est requise'),
  content: z.string().min(1, 'Le contenu est requis'),
  level: z.enum(['A1', 'A2', 'B1', 'B2'], {
    errorMap: () => ({ message: 'Le niveau doit être A1, A2, B1 ou B2' })
  }),
  order: z.string().min(1, 'L\'ordre est requis').refine((val) => !isNaN(parseInt(val)) && parseInt(val) > 0, 'L\'ordre doit être un nombre positif'),
  // URL vidéo optionnelle (YouTube, etc.)
  videoUrl: z.string().url('URL vidéo invalide').optional()
});

// Schéma de mise à jour de cours
const courseUpdateSchema = courseSchema.partial();

// Schéma de média
const mediaSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  description: z.string().min(1, 'La description est requise'),
  type: z.enum(['series', 'podcast', 'film'], {
    errorMap: () => ({ message: 'Le type doit être series, podcast ou film' })
  }),
  language: z.string().min(1, 'La langue est requise'),
  languageLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
  subtitles: z.string().optional(),
  duration: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  viewers: z.string().optional(),
  imageUrl: z.string().url('URL d\'image invalide').optional(),
  streamingUrl: z.string().url('URL de streaming invalide').optional(),
  platform: z.string().optional(),
  categoryId: z.string().min(1, 'La catégorie est requise'),
  
  // Champs spécifiques aux films
  director: z.string().optional(),
  cast: z.string().optional(),
  year: z.number().min(1900).max(2030).optional(),
  genre: z.string().optional(),
  
  // Champs spécifiques aux séries
  season: z.number().min(1).optional(),
  episodes: z.number().min(1).optional()
});

// Schéma de mise à jour de média
const mediaUpdateSchema = mediaSchema.partial();

// Middleware de validation générique
const validate = (schema) => {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => err.message);
        return res.status(400).json({ 
          error: 'Données invalides',
          errors: errors
        });
      }
      next(error);
    }
  };
};

// Middlewares de validation spécifiques
const validateLogin = validate(loginSchema);
const validateCourse = validate(courseSchema);
const validateCourseUpdate = validate(courseUpdateSchema);
const validateMedia = validate(mediaSchema);
const validateMediaUpdate = validate(mediaUpdateSchema);

module.exports = {
  validateLogin,
  validateCourse,
  validateCourseUpdate,
  validateMedia,
  validateMediaUpdate
};
