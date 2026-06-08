import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

/**
 * Cloud Function para crear usuario de prueba
 * Endpoint: POST https://crearUsuarioPrueba-tdwq3uhjga-uc.a.run.app
 * Solo para desarrollo
 */
export const crearUsuarioPrueba = functions
  .https
  .onRequest(async (req, res) => {
    // Permitir solo POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Método no permitido' });
      return;
    }

    try {
      const auth = admin.auth();

      const usuarioTest = {
        email: 'admin@laparada.test',
        password: 'Admin123456',
        displayName: 'Administrador La Parada',
      };

      // Intentar obtener usuario existente
      let usuario;
      try {
        usuario = await auth.getUserByEmail(usuarioTest.email);
        res.json({
          estado: 'ya_existe',
          mensaje: 'Usuario ya existe',
          email: usuario.email,
          uid: usuario.uid,
        });
        return;
      } catch (err) {
        // Usuario no existe, continuamos creándolo
      }

      // Crear usuario
      usuario = await auth.createUser({
        email: usuarioTest.email,
        password: usuarioTest.password,
        displayName: usuarioTest.displayName,
        emailVerified: true,
      });

      res.json({
        estado: 'creado',
        mensaje: '✅ Usuario creado exitosamente',
        email: usuarioTest.email,
        password: usuarioTest.password,
        displayName: usuarioTest.displayName,
        uid: usuario.uid,
        urls: {
          local: 'http://localhost:5173',
          produccion: 'https://la-parada-ecb37.web.app',
        },
      });

    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  });
