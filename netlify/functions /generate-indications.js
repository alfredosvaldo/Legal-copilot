// This is a Netlify Function. It runs on a server, not in the browser.
// It's designed to securely handle your API key.

exports.handler = async function(event, context) {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Get the text from the request sent by the frontend
        const { originalText, finalText } = JSON.parse(event.body);

        // Get the secret API key from Netlify's environment variables
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error('API key is not configured on the server.');
        }
        
        // The same detailed prompt we used before
        const prompt = `
            **Rol y Objetivo:** Eres un asesor legal experto, especializado en la redacción de leyes en Chile. Tu tarea es analizar dos versiones de un texto legal ('Texto Original' y 'Texto Final') y generar una "Propuesta de Indicaciones" formal que describa los cambios con absoluta precisión, utilizando la terminología oficial de la ley chilena.

            **Instrucciones Fundamentales:**
            1.  **Analizar con Precisión:** Compara el 'Texto Original' y el 'Texto Final' para identificar todas las adiciones, eliminaciones y sustituciones.
            2.  **Identificar la Unidad de Cambio Mínima:** Esto es crítico. Antes de concluir que un 'inciso' completo ha sido eliminado o reemplazado, verifica meticulosamente si el cambio es más pequeño. ¿Es solo una 'frase', una 'expresión' o una 'palabra' lo que se ha alterado dentro del inciso? El objetivo es ser lo más específico y minimalista posible en la descripción del cambio.
            3.  **Formular Indicaciones:** Para cada cambio, formula una indicación precisa utilizando el verbo y el sustantivo correctos del glosario a continuación.
            4.  **El Contexto es Clave:** Al describir un cambio, proporciona contexto. Por ejemplo, especifica qué 'inciso' se está modificando.

            **Glosario de Terminología Legislativa (Uso Obligatorio):**

            * **Verbos de Acción:**
                * **reemplázase / sustitúyese:** Usar cuando se sustituye información. \`sustitúyese\` es para bloques grandes (como un \`inciso\` completo), mientras que \`reemplázase\` es para unidades más pequeñas (\`expresión\`, \`frase\`, \`palabra\`).
                * **incorpórase / agrégase / añádese:** Usar cuando se añade nueva información.
                * **suprímese / elimínase:** Usar cuando se elimina información. **Crucialmente, especifica el alcance.** Si solo se elimina una frase de un párrafo, la indicación debe ser 'Suprímese, en el inciso [X], la frase: "[texto a eliminar]"', NO 'Suprímese el inciso [X]'.
                * **intercálese:** Usar específicamente cuando se añade información *entre* palabras existentes.
                * **modifícase:** Usar solo para modificaciones genéricas que no encajan en otras categorías (evitar si es posible).

            * **Sustantivos para Unidades de Texto:**
                * **la expresión:** Un conjunto de palabras. (Uso general).
                * **la frase:** Un conjunto de palabras con un significado específico.
                * **la oración:** Una oración completa.
                * **la palabra / el vocablo:** Una sola palabra.
                * **el inciso:** Un párrafo o una parte específica de un artículo.

            **Formato de Salida y Ejemplos:**
            La respuesta debe comenzar con una frase introductoria estándar. Cada modificación debe ser un punto separado.

            *Ejemplo de Sustitución:*
            Para modificar el artículo en el siguiente sentido:
            a) Reemplázase, en el inciso primero, la expresión "no podrá exceder" por "corresponderá a".

            *Ejemplo de Eliminación Parcial (Forma Correcta):*
            Para modificar el artículo en el siguiente sentido:
            a) Suprímese, en el inciso segundo, la frase: "sin restricción ni limitación alguna".

            *Ejemplo de Reemplazo de Párrafo Completo:*
            Para modificar el artículo en el siguiente sentido:
            a) Sustitúyese el inciso tercero por el siguiente: "[texto del nuevo párrafo]".

            ---
            **Analiza los siguientes textos:**

            **Texto Original:**
            \`\`\`
            ${originalText}
            \`\`\`

            **Texto Final:**
            \`\`\`
            ${finalText}
            \`\`\`
            ---
            Ahora, genera la "Propuesta de Indicaciones" con la máxima precisión.
        `;

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }]
        };

        // Call the Google API from the server
        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!geminiResponse.ok) {
            throw new Error(`Google API request failed with status ${geminiResponse.status}`);
        }

        const result = await geminiResponse.json();
        const generatedText = result.candidates[0].content.parts[0].text;

        // Send the successful response back to the frontend
        return {
            statusCode: 200,
            body: JSON.stringify({ text: generatedText })
        };

    } catch (error) {
        console.error('Error in Netlify function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
