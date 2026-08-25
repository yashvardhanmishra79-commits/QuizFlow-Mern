// API Calling fn ? --> fetch
// API Calling library --> axios
// Installing axios command: npm i axios

/* fetch("http://localhost:4400/login",{
    method: "post",
    header: {"Content-Type":"application/json"},
    body: JSON.stringify(data)
})*/

// api.post("/login",data)

import axios from "axios";
const api = axios.create({
  headers: { "Content-Type": "application/json" },
  baseURL: "http://localhost:4400",
});

export default api;
