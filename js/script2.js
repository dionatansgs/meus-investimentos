const PROXY_BASE_URL = "https://proxy-brapi.dionatan-sgs.workers.dev"; // <-- ajuste aqui
const SESSION_STORAGE_KEY = "meus_investimentos_session";
const USER_ID_STORAGE_KEY = "meus_investimentos_user_id";


const toastEl = document.getElementById("toast");


function setStatus(msg, type=""){
  const el = document.getElementById("status");
  if(!el) return;
  el.textContent = msg || "";
  el.className = "status " + (type||"");
}

function toast(msg, time=2500){
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(()=>toastEl.classList.remove("show"), time);
}
 

 /* ====== Login modal handlers ====== */
 async function fazerLoginModal() {
    const userIdEl = document.getElementById("modalLoginUserId");
    const passEl = document.getElementById("modalLoginPassword");
  
    const userId = userIdEl ? userIdEl.value.trim() : "";
    const password = passEl ? passEl.value : "";
  
    if (!userId || !password) {
      alert("Informe usuário e senha.");
      return;
    }
  
    setStatus("Autenticando...", "");
  
    try {
      const resp = await fetch(`${PROXY_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password }),
      });
  
      const text = await resp.text();
      let json;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  
      console.log("LOGIN RESPONSE:", resp.status, json || text);
  
      if (!resp.ok) {
        const message = (json && json.error) ? json.error : text;
        toast("Erro: " + message, 4000);
        setStatus("Falha ao autenticar: " + message, "error");
        return;
      }
  
      if (!json || !json.ok || !json.sessionId) {
        toast("Resposta inválida do servidor.", 4000);
        setStatus("Resposta inválida.", "error");
        return;
      }
  
      // Sucesso!
      sessionToken = json.sessionId;
      currentUserId = json.user.id;
  
      localStorage.setItem(SESSION_STORAGE_KEY, sessionToken);
      localStorage.setItem(USER_ID_STORAGE_KEY, currentUserId);
  
      try {
        cryptoKey = await deriveKey(password, json.encryptionSalt);
      } catch (e) {
        toast("Erro ao derivar chave.", 4000);
        console.error(e);
        return;
      }
  
      passEl.value = "";
      document.getElementById("currentUserLabel").textContent = currentUserId;
  
      // 🎉 FECHA O MODAL AQUI (garantido)
      //hideModal();
  
      toast("Login realizado com sucesso!", 2500);
      setStatus(`Logado como ${currentUserId}. Sincronizando...`, "success");
  
      await sincronizarComNuvemAoAbrir();
  
    } catch (err) {
      console.error("Erro de login:", err);
      toast("Erro ao conectar ao servidor.", 4000);
      setStatus("Erro de conexão.", "error");
    }
  }

/* ====== attach modal buttons & enter key handling ====== */
(function attachLoginHandlers(){
    
    function safe(id){ return document.getElementById(id); }

    function add(){
      
      const loginBtn = safe("modalLoginBtn"), cancelBtn = safe("modalCancelBtn"), userInput = safe("modalLoginUserId"), passInput = safe("modalLoginPassword");
      
      if(!loginBtn) return console.warn("#modalLoginBtn não encontrado");

      loginBtn.replaceWith(loginBtn.cloneNode(true));

      const fresh = safe("modalLoginBtn");

      fresh.addEventListener("click", async (e)=>{ e.preventDefault(); await fazerLoginModal(); });

      cancelBtn?.addEventListener("click", ()=>{  /*fechar tudo? apenas recarrega página para garantir  location.reload();*/ 
        if(sessionToken){ 
          hideModal();
        }
      });
      passInput?.addEventListener("keydown", (ev)=>{ if(ev.key==="Enter"){ ev.preventDefault(); fresh.click(); }});
    }
    if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", add); else add();
  })();


 


/* ====== Init on load ====== 
(async function init(){
    document.getElementById("footerAtualizacao").textContent = "Última versão da aplicação: " + APP_VERSION;
    // restore tab
    const st = localStorage.getItem("meus_investimentos_tab"); if(st) setActiveTab(st);
    // attach controls
    document.getElementById("openLoginModalBtn").addEventListener("click", ()=>{ document.getElementById("modalLoginUserId").value = currentUserId || ""; showModal(); });
    document.getElementById("logoutBtn").addEventListener("click", ()=>{ if(confirm("Deseja finalizar a sessão?")) fazerLogout(); });
    // se tiver sessão mas não tiver key derivada, pede senha (abrir modal)
    if(!sessionToken){ showModal(); } else {
      document.getElementById("modalLoginUserId").value = currentUserId || "";
      showModal(); // pede senha para derivar chave
    }
    //render();
  })();*/