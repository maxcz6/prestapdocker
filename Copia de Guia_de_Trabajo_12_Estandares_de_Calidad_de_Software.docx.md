# **GUÍA DE TRABAJO N.º 12**

**ESTÁNDARES DE CALIDAD DE SOFTWARE**

*Evaluación práctica del backend con ISO/IEC 25010*

| DATOS ACADÉMICOS | INFORMACIÓN |
| ----- | ----- |
| Unidad didáctica | Gestión de aplicaciones web |
| Periodo académico / semestre | 2026-II / VI semestre |
| Semana | 12 |
| Título de la sesión | Estándares de calidad de software |
| Indicador de logro | Aplica criterios de calidad de software para evaluar el backend de una aplicación web según su arquitectura de servidor. |
| Docente | Ing. Erick Donniex Moscoso Bravo |
| Equipo / integrantes | Max paucar ramos  |

# **I. PROPÓSITO DE LA PRÁCTICA**

Evaluar un componente real del backend del Proyecto Integrador mediante cuatro características de calidad seleccionadas de ISO/IEC 25010: mantenibilidad, fiabilidad, eficiencia de desempeño y seguridad. El equipo sustentará cada valoración con una prueba o evidencia y propondrá hasta tres mejoras verificables.

# **II. PRODUCTO DE LA PRÁCTICA**

* Ficha de alcance del componente evaluado y condiciones de prueba.  
* Matriz de calidad con cuatro criterios, resultados, evidencias y puntuación justificada.  
* Plan priorizado de hasta tres acciones de mejora, con responsable y verificación.  
* Anexos con capturas, registros, resultados o fragmentos técnicos que respalden la evaluación.

# **III. EQUIPOS Y MATERIALES**

* Backend del Proyecto Integrador ejecutándose en entorno local o staging, con datos de prueba.  
* Editor de código, terminal, registros de la aplicación y repositorio del equipo.  
* Postman, Insomnia, curl u otra herramienta equivalente para probar solicitudes HTTP.  
* Cronómetro o herramienta de medición disponible; no se exige una plataforma de carga especializada.  
* Esta guía editable. No adjuntar contraseñas, tokens, datos personales ni secretos reales.

# **IV. REFERENCIA TÉCNICA BREVE**

ISO/IEC 25010:2023 presenta un modelo de calidad del producto compuesto por nueve características. En esta práctica se trabajan únicamente las cuatro previstas en la sesión. La escala 1–3 es un recurso didáctico para comparar hallazgos; no constituye una certificación ISO.

| CARACTERÍSTICA | PREGUNTA PRÁCTICA | EVIDENCIA POSIBLE |
| ----- | ----- | ----- |
| Mantenibilidad | ¿El componente puede entenderse, modificarse y probarse sin dificultad innecesaria? | Estructura modular, duplicación, complejidad observable, pruebas automatizadas. |
| Fiabilidad | ¿Mantiene el servicio y gestiona fallos previsibles de manera controlada? | Respuesta ante error, registros, recuperación, validación de excepciones. |
| Eficiencia de desempeño | ¿Responde dentro del tiempo esperado bajo condiciones declaradas? | Tiempos de respuesta, P95, tasa de error, número de solicitudes y entorno. |
| Seguridad | ¿Impide accesos o acciones no autorizadas y protege la información? | Códigos HTTP, pruebas de roles, validación, gestión de secretos y registros. |

## **Escala de valoración**

| PUNTAJE | INTERPRETACIÓN | DECISIÓN |
| ----- | ----- | ----- |
| 1 — Deficiente | No cumple el criterio o existe un fallo importante demostrado. | Corregir con prioridad. |
| 2 — Parcial | Cumple solo en parte; hay limitaciones o evidencia incompleta. | Planificar mejora y volver a probar. |
| 3 — Adecuado | Cumple el criterio definido y la evidencia es suficiente. | Mantener y monitorear. |

# **V. PROCEDIMIENTO**

## **Actividad 1\. Delimitar el componente y la línea base**

Elijan un solo componente verificable: un endpoint, servicio, módulo o flujo del backend. Registren el entorno y los datos usados para que otra persona pueda repetir la prueba. No evalúen toda la aplicación en esta sesión.

*Ejemplo: POST /api/pedidos en staging; FastAPI 0.115 y PostgreSQL 16; 100 pedidos de prueba; usuario con rol vendedor; ejecución desde una laptop conectada a la red del laboratorio.*

| CAMPO | RESPUESTA DEL EQUIPO |
| ----- | ----- |
| Componente o flujo evaluado |  |
| Arquitectura y tecnología |  |
| Entorno y versión desplegada |  |
| Datos / usuario de prueba |  |
| Condiciones de ejecución |  |
| Criterio de éxito general |  |

## **Actividad 2\. Analizar el caso resuelto con el docente**

Caso: backend de pedidos. El equipo revisa un endpoint administrativo y obtiene los siguientes resultados. Observe que cada puntuación se apoya en una evidencia concreta y que el criterio esperado se declara antes de valorar.

| CARACTERÍSTICA | CRITERIO ESPERADO | RESULTADO / EVIDENCIA | PUNTAJE |
| ----- | ----- | ----- | ----- |
| Mantenibilidad | La regla de descuento existe en un único servicio y posee pruebas. | La misma regla está copiada en cuatro módulos; una corrección exige editar cuatro archivos. | 1 |
| Fiabilidad | Una caída temporal de BD se controla, registra y devuelve un mensaje seguro. | Al detener la BD, la solicitud termina en 500 no controlado; no existe reintento ni mensaje útil. | 1 |
| Eficiencia | P95 ≤ 500 ms, 50 solicitudes, 0 % de error, mismo entorno. | P95 \= 610 ms; 50 solicitudes; 0 % de error; consulta repetida por cada ítem. | 2 |
| Seguridad | Un usuario vendedor no accede a /admin/reportes; respuesta esperada 403\. | El vendedor recibe 200 y visualiza el reporte administrativo. | 1 |

**Decisión del caso: la seguridad se atiende primero porque existe acceso no autorizado. Luego se corrige el error no controlado, se centraliza la regla de negocio y se optimiza la consulta. La prioridad no se obtiene sumando puntajes: se decide por impacto, urgencia y dependencia técnica.**

## **Actividad 3\. Ejecutar cuatro evaluaciones en el proyecto**

Definan un criterio medible para cada característica, ejecuten una comprobación y registren el resultado real. Una captura sin contexto no es suficiente: debe mostrar qué se probó, bajo qué condición y cuál fue el resultado.

| CARACTERÍSTICA | CRITERIO / RESULTADO ESPERADO | PRUEBA EJECUTADA | RESULTADO Y EVIDENCIA | 1–3 | HALLAZGO |
| ----- | ----- | ----- | ----- | ----- | ----- |
| Mantenibilidad | Ej.: la validación está centralizada y cubierta por una prueba. |  |  |  |  |
| Fiabilidad | Ej.: una dependencia caída produce respuesta controlada y registro útil. |  |  |  |  |
| Eficiencia | Ej.: P95 ≤ 500 ms en 50 solicitudes, 0 % de error. |  |  |  |  |
| Seguridad | Ej.: el rol usuario recibe 403 al solicitar una ruta administrativa. |  |  |  |  |

## **Orientación para ejecutar las pruebas**

| ÁREA | ACCIÓN MÍNIMA | EJEMPLO DE REGISTRO |
| ----- | ----- | ----- |
| Mantenibilidad | Revisar un cambio reciente o una regla de negocio; localizar duplicación, acoplamiento y pruebas. | La regla aparece en 3 archivos y no posee prueba unitaria: puntaje 1\. |
| Fiabilidad | Provocar un fallo seguro y reversible: dato inválido, recurso inexistente o dependencia de prueba no disponible. | ID inexistente devuelve 404 con mensaje controlado y genera registro: puntaje 3\. |
| Eficiencia | Repetir solicitudes en el mismo entorno y anotar cantidad, tiempo y errores. Si la herramienta lo permite, registrar P95. | 50 solicitudes; promedio 220 ms; P95 410 ms; 0 errores; criterio ≤ 500 ms: puntaje 3\. |
| Seguridad | Probar desde el servidor una acción autorizada y otra no autorizada; no limitarse a ocultar botones. | Rol usuario solicita /admin: 403; rol admin: 200; no se exponen datos sensibles: puntaje 3\. |

## **Actividad 4\. Priorizar y proponer mejoras**

Seleccionen como máximo tres acciones. Cada acción debe responder a un hallazgo de la matriz y describir cómo se comprobará la mejora. Eviten acciones vagas como “mejorar el código” o “aumentar la seguridad”.

*Ejemplo: aplicar verificación de rol en el endpoint /admin/reportes; responsable: Ana; evidencia esperada: usuario vendedor recibe 403 y administrador recibe 200; fecha: 12/11/2026.*

| PRIORIDAD | HALLAZGO / CARACTERÍSTICA | ACCIÓN CONCRETA | RESPONSABLE Y FECHA | VERIFICACIÓN ESPERADA | ESTADO |
| ----- | ----- | ----- | ----- | ----- | ----- |
| 1 |  |  |  |  | Pendiente |
| 2 |  |  |  |  | Pendiente |
| 3 |  |  |  |  | Pendiente |

## **Actividad 5\. Revisión entre equipos**

Otro equipo revisará la trazabilidad de la evaluación, sin repetir las pruebas. Debe comprobar que el criterio, la evidencia, la puntuación y la acción propuesta cuentan la misma historia.

| CRITERIO DE REVISIÓN | CUMPLE | AJUSTAR | OBSERVACIÓN CONCRETA |
| ----- | ----- | ----- | ----- |
| El alcance y las condiciones permiten repetir la prueba. | ☐ | ☐ |  |
| Los cuatro criterios son claros y medibles. | ☐ | ☐ |  |
| Cada puntuación coincide con el resultado mostrado. | ☐ | ☐ |  |
| Las evidencias tienen contexto y no exponen datos sensibles. | ☐ | ☐ |  |
| Cada mejora responde a un hallazgo y puede verificarse. | ☐ | ☐ |  |

# **VI. RESULTADOS**

| RESULTADO FINAL | RESPUESTA DEL EQUIPO |
| ----- | ----- |
| Característica con mejor resultado y evidencia principal |  |
| Característica más débil y efecto en el backend |  |
| Mejora que se ejecutará primero y motivo |  |
| Limitación de la evaluación realizada |  |

# **VII. CONTROL Y VERIFICACIÓN**

☐ Se evaluó un componente definido, no toda la aplicación de manera general.

☐ Se trabajaron mantenibilidad, fiabilidad, eficiencia de desempeño y seguridad.

☐ Cada criterio fue declarado antes de asignar el puntaje.

☐ La prueba de rendimiento incluye condiciones, cantidad de solicitudes y errores.

☐ La prueba de fiabilidad fue segura, controlada y reversible.

☐ La autorización se comprobó en el backend con al menos dos roles o condiciones.

☐ Las evidencias respaldan los resultados y no muestran secretos ni datos personales.

☐ Las mejoras están vinculadas con los hallazgos y tienen verificación esperada.

# **VIII. CONCLUSIONES**

**1\. ¿Qué evidencia cambió o confirmó la percepción inicial del equipo sobre la calidad del backend?**

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**2\. ¿Qué característica requiere atención prioritaria y por qué afecta al usuario o al mantenimiento del sistema?**

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**3\. ¿Cómo comprobarán que la mejora priorizada produjo un resultado real?**

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

# **IX. ANEXOS**

* Anexo 1\. Capturas o registros identificados con característica, prueba y resultado.  
* Anexo 2\. Resultados exportados de la herramienta de pruebas, si corresponde.  
* Anexo 3\. Fragmentos técnicos necesarios para sustentar el hallazgo, sin secretos.  
* Anexo 4\. Registro de la revisión entre equipos.

# **REFERENCIAS BIBLIOGRÁFICAS**

International Organization for Standardization. (2023). ISO/IEC 25010:2023, Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — Product quality model.

International Organization for Standardization. (2014). ISO/IEC 25000:2014, Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — Guide to SQuaRE.

# **NOTA FINAL**

**Esta guía constituye la duodécima evidencia del Proyecto Integrador. La matriz y el plan de mejora deberán incorporarse a la documentación técnica del equipo, conservando únicamente evidencias verificables y seguras.**