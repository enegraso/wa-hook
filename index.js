require('dotenv').config();
const express = require('express');
const morgan = require("morgan");
const axios = require("axios");
const body_parser = require("body-parser");
const { GoogleSpreadsheet } = require('google-spreadsheet');

// para ver si me acepta el json a Google SpreadSheet
// const CircularJSON = require('circular-json')

const port = process.env.HOST_PORT;
const watoken = process.env.WA_TOKEN;
// Create HTTP server

const app = express().use(body_parser.json());
app.use(morgan("dev"));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // update to match the domain you will make the request from
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    next();
});

console.log(port);
app.listen(port, () => {
    console.log(`\n${app.name} listening to ${app.url} at ${port} `);
});

const token = "verify-s2k"
// verfiy the web hok
app.get('/webhooks', (req, res) => {
    console.log(req);
    if (
        req.query['hub.mode'] == 'subscribe' &&
        req.query['hub.verify_token'] == token
    ) {
        res.send(req.query['hub.challenge']);
    } else {
        res.sendStatus(400);
    }
});

app.post('/webhooks', (req, res) => {
    const body_param = req.body;
    try {
        if (body_param) {
            switch (body_param.entry[0].changes[0].value.messages[0].type) {
                case 'text':
                    console.log('Mensaje de texto');
                    console.log("cuerpo del mensaje",body_param.entry[0].changes[0].value.messages[0])
                    break;
                case 'image':
                    console.log('Mensaje de imagen');
                    console.log("cuerpo del mensaje",body_param.entry[0].changes[0].value.messages[0])
                    break;
                case 'contacts':
                    console.log('Mensaje de contacto');
                    console.log("cuerpo del mensaje",body_param.entry[0].changes[0].value.messages[0])
                    break;
                default:
                    console.log(`Mensaje tipo:`, body_param.entry[0].changes[0].value.messages[0].type);
                    console.log("cuerpo del mensaje",body_param.entry[0].changes[0].value.messages[0])
            }

/*             console.log("Envia",body_param.entry[0].changes[0].value.messages[0].from);
            console.log("=====");
            if (body_param.entry[0].changes[0].value.messages[0].type === "text") {
                console.log("Escribió",body_param.entry[0].changes[0].value.messages[0].text.body);
                console.log("=====");
            } else {
                console.log("cuerpo del mensaje",body_param.entry[0].changes[0].value.messages[0]);
                console.log("=====");
            } 
            console.log(body_param.entry[0].changes[0].value.messages[0].id);
            console.log("====");
            console.log(body_param.entry[0].changes[0].value.messages[0].timestamp);
            console.log("====");
            console.log(body_param.entry[0].changes[0].value.messages[0].type);
            console.log("====");
 */        }
        res.status(200).json(body_param)

    } catch (error) {
        res.status(400).send({ "mensaje": error })
    }
});

app.get('/webhooks/sendmess', (req, res) => {
    let config = req.body.config
    let datos = req.body.datos
    try {
        console.log("Configuracion =====", config)
        console.log("Enviar datos =====", datos)
        axios({
            method: "POST",
            // url: "https://graph.facebook.com/v16.0/116143091476127/messages?access_token="+watoken,
            url: config.url + "?access_token=" + config.token,
            data: datos,
            headers: {
                "Content-Type": "application/json",
                // 'Authorization':'EAAYN6DnJ604BADDAcKaS5GZBerkS17fFshLKDzxjBkfc6FifdGLZBbPDCjKKNe76ZBq0weBUYwSrKvdbPk0A0grtZAUHEqfP0GiJOHST2bQIyWybyj73yr5ZBNpWCHUZB5LezeDKVakslPE8U9hGGd9V5BcFrGgwkw0JfbgvZBsV9RisTJrLrpVWUrlI5L0ZA6gyEgPvDKk7ZBVjC3HmzSMUP'
            }
        })
        // console.log(req)
        //      console.log("==============================================", datos, "=================================")
        res.sendStatus(200)
    } catch (error) {
        res.status(400).send({ "mensaje": error })
    }
});

app.post('/webhooks/google', async (req, res) => {
    const { diaavisa } = req.body
    console.log("Dia de aviso:" + diaavisa)
    try {

        const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
        const SHEET_ID = process.env.SHEET_ID;

        // Initialize the sheet - doc ID is the long id in the sheets URL
        const doc = new GoogleSpreadsheet(SPREADSHEET_ID);

        // Initialize Auth - see https://theoephraim.github.io/node-google-spreadsheet/#/getting-started/authentication
        await doc.useServiceAccountAuth({
            // env var values are copied from service account credentials generated by google
            // see "Authentication" section in docs for more info
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY,
        });

        await doc.loadInfo(); // loads document properties and worksheets
        console.log(doc.title);
        // await doc.updateProperties({ title: 'renamed doc' });
        const sheet = doc.sheetsById[SHEET_ID] // doc.sheetsByIndex[0]; // or use doc.sheetsById[id] or doc.sheetsByTitle[title]
        // console.log("=Titulo=" + sheet.title);
        // console.log("=Filas=" + sheet.rowCount);
        let data = await sheet.getRows()
        let cont = 0
        let avisar = []
        data.forEach(row => {
            if (row.AV == diaavisa && row.n == 1 && (row.T == "F" || row.T == "f")) {
                let contacto = row.Contacto.replaceAll("-", "")
                let waprev = contacto.replaceAll(" ", "")
                let wa = ""
                if (waprev.substring(0, 3) === "598")
                    wa = waprev.substring(0, 12)
                else
                    wa = "54" + waprev.substring(0, 12)
                let fila = row.n + " || " + row.AV + " || " + row.Cuenta + " || " + row.V + " || " + wa + " || " + row.Nombre
                let enlace = "https://api.whatsapp.com/send?phone=" + wa + "text=/vence"
                const cliente = {
                    vence: row.V,
                    cuenta: row.Cuenta,
                    nombre: row.Nombre,
                    pago: row.Mespago,
                    celu: wa,
                    rol: "final",
                }
                avisar.push(cliente)
                cont++
                console.log(" - " + fila, enlace)
            }
            if (row.AV == diaavisa && (row.T == "r" || row.T == "R")) {
                let contacto = row.Contacto.replaceAll("-", "")
                let waprev = contacto.replaceAll(" ", "")
                let wa = ""
                if (waprev.substring(0, 3) === "598")
                    wa = waprev.substring(0, 12)
                else
                    wa = "54" + waprev.substring(0, 12)
                let fila = row.n + " || " + row.AV + " || " + row.Cuenta + " || " + row.V + " || " + wa + " || " + row.nombre
                let enlace = "https://api.whatsapp.com/send?phone=" + wa + "text=/vence"
                const cliente = {
                    vence: row.V,
                    cuenta: row.Cuenta,
                    nombre: row.Nombre,
                    pago: row.Mespago,
                    celu: wa,
                    rol: "Vendedor",
                }
                avisar.push(cliente)
                cont++
                console.log(" - " + fila, enlace)
            }
        });
        console.log(cont)

        // adding / removing sheets
        // const newSheet = await doc.addSheet({ title: 'hot new sheet!' });
        // await newSheet.delete();
        return res.status(200).json(avisar)

    } catch (error) {
        console.error(error)
        return res.status(400).send({ "message": error })
    }

});

app.post(('/webhooks/addcliente'), async (req, res) => {

    try {

        const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
        const SHEET_ID = process.env.SHEET_ID;

        // Initialize the sheet - doc ID is the long id in the sheets URL
        const doc = new GoogleSpreadsheet(SPREADSHEET_ID);

        // Initialize Auth - see https://theoephraim.github.io/node-google-spreadsheet/#/getting-started/authentication
        await doc.useServiceAccountAuth({
            // env var values are copied from service account credentials generated by google
            // see "Authentication" section in docs for more info
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY,
        });

        const obj = { "strings": [{ n: "prueba", name: "federico", email: "federico@federico" }] };
        // obj.name = obj;
        const result = JSON.stringify(obj, getCircularReplacer());
        console.log(result); // 👉️ {"address":{"country":"Chile"},"numbers":[1,2,3],"age":30}
        console.log(obj)

        await doc.loadInfo(); // loads document properties and worksheets
        const sheet = doc.sheetsById[258060524]  //[SHEET_ID] // ({ headerValues: ['V', 'AV'] })
        // append rows 
        const larryRow = await sheet.addRow(obj);
        // append rows
        return res.status(200).json(larryRow)
    } catch (error) {
        console.error(error)
        return res.status(400).send({ "message": error })
    }
})

const getCircularReplacer = () => {
    const seen = new WeakSet();
    return (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return;
            }
            seen.add(value);
        }
        return value;
    };
};