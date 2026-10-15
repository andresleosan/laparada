# Auditoría de dependencias — 2026-10-15

## Alcance y resultado

La auditoría inicial del workspace encontró **78 avisos**: 1 crítico, 31 altos,
37 moderados y 9 bajos. La revisión anterior limitada a producción había detectado 19.

Se actualizan las dependencias afectadas conservando Firebase 11 en el frontend,
Firebase Admin 13 y el runtime Node 20 de Cloud Functions. No se despliega a producción.

Resultado final: **0 avisos en producción** y **1 aviso en la auditoría completa**,
correspondiente a `braces` parcheado localmente. Se eliminan 77 avisos y se mitiga el
restante sin ocultarlo al escáner.

## Correcciones

| Dependencia directa | Versión instalada |
| --- | --- |
| Axios de Cloud Functions | 1.20.0 |
| Firebase CLI | 15.34.0 |
| Wrangler | 4.150.0 |
| Sharp | 0.35.5 |

El lockfile también actualiza las dependencias transitivas vulnerables dentro de sus
rangos compatibles. Firebase CLI 15.34 elimina la cadena `proxy-agent`/`basic-ftp`.
Se conserva una excepción de antigüedad de publicación exclusivamente para esa versión
de la CLI, necesaria para instalar esta corrección de seguridad.

Tres overrides acotados resuelven restricciones de versiones mantenidas por los paquetes
padre: `@grpc/grpc-js` 1.14.5 para Firestore 4.8, `qs` 6.16.0 para consumidores de la rama 6
y `postcss-selector-parser` 7.1.6 para consumidores de la rama 6. El parser conserva las
API CommonJS/AST utilizadas por Tailwind 3 y postcss-nested 6; una comparación de variantes
representativas produjo CSS idéntico y la compilación del proyecto conserva su artefacto CSS.

## Braces: corrección local pendiente de publicación oficial

El aviso [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
afecta a `braces` 3.0.3, utilizado solo por herramientas de desarrollo. La auditoría sugiere
3.0.4, pero esa versión no existe en npm y el aviso oficial indica que no hay versión
corregida. Una entrada de unos 9.000 caracteres con anidamiento profundo reproduce un
`RangeError` por agotamiento de pila.

El parche local mantenido con `patchedDependencies` limita el anidamiento de estructuras
en el parser y en los recorridos del AST. Las entradas excesivas fallan de forma controlada
con `SyntaxError`; también se comprueban AST construidos directamente y patrones normales.
La versión sigue siendo 3.0.3: **la auditoría completa conserva este aviso aunque el código
instalado esté parcheado**. No se agrega ninguna exclusión de avisos ni se altera la versión
del paquete para ocultarlo.

Los parches conservan finales de línea LF mediante `.gitattributes` para mantener estable
su hash entre checkouts de Windows y Unix.

Cuando exista una versión oficial corregida, actualizar el paquete, retirar el parche y
volver a ejecutar sus pruebas de regresión y la auditoría completa.

## Verificación

Verificación completada: instalación con `--frozen-lockfile`, 188 pruebas unitarias,
61 pruebas de reglas/integración en emuladores, lint sin errores, compilación frontend,
tipos de Cloud Functions y presupuesto de bundle aprobados. Las 15 regresiones del parche
están incluidas en las 188 pruebas unitarias. La revisión independiente no encontró
problemas accionables.

Los comandos reproducibles son `pnpm audit --prod`, `pnpm audit`, `pnpm test`, `pnpm lint`,
`pnpm build`, `pnpm exec tsc -p firebase-functions/tsconfig.json --noEmit`,
`pnpm check:bundle` y `pnpm test:rules`.

Para los emuladores, esta máquina requiere seleccionar temporalmente Java 21 en `JAVA_HOME`
y anteponer su carpeta `bin` al `PATH`: el Java predeterminado es 8. La variable `DEBUG`
se deja vacía durante la ejecución para evitar volcados del entorno en los logs de la CLI.

## Fuentes

- [Aviso de proxy-addr](https://github.com/advisories/GHSA-jqcg-44mw-7w3h).
- [Firebase CLI 15.34.0](https://github.com/firebase/firebase-tools/releases/tag/v15.34.0).
- [Aviso de postcss-selector-parser](https://github.com/advisories/GHSA-rj75-hqrm-r3gf).
- [Cambio de API de parser 7](https://github.com/postcss/postcss-selector-parser/releases/tag/v7.0.0).
