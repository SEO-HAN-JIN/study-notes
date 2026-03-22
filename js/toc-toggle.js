document$.subscribe(function () {
  const oldBtn = document.querySelector(".toc-toggle-btn");
  if (oldBtn) oldBtn.remove();

  const body = document.body;
  const toc = document.querySelector(".md-sidebar--secondary");

  if (!toc) return;

  const btn = document.createElement("button");
  btn.className = "toc-toggle-btn";
  btn.type = "button";
  btn.setAttribute("aria-label", "목차 열기/닫기");
  btn.innerHTML = "&lt;";

  btn.addEventListener("click", function () {
    body.classList.toggle("toc-open");
    btn.innerHTML = body.classList.contains("toc-open") ? "&gt;" : "&lt;";
  });

  document.body.appendChild(btn);
});