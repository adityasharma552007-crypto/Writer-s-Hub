require('dotenv').config();
const fs = require('fs');

async function checkSchema() {
    try {
        const res = await fetch(process.env.SUPABASE_URL + '/rest/v1/', {
            headers: { 
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
            }
        });
        const data = await res.json();
        if (data.definitions && data.definitions.entries) {
            fs.writeFileSync('schema_dump.json', JSON.stringify(data.definitions.entries, null, 2));
            console.log("Dumped to schema_dump.json");
        } else {
            console.log("No definitions or entries found!");
            fs.writeFileSync('schema_dump.json', JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("FATAL ERROR", e);
    }
}
checkSchema();
