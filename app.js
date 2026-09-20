(function () {
  "use strict";

  var app = document.getElementById("app");
  var STORAGE = {
    fontScale: "iam_font_scale",
    theme: "iam_theme",
    wipDismissed: "iam_wip_dismissed",
    lastChapter: "iam_last_chapter"
  };

  // ---------- Settings: font size ----------
  function getFontScale() {
    var v = parseFloat(localStorage.getItem(STORAGE.fontScale));
    return isNaN(v) ? 1 : v;
  }
  function setFontScale(v) {
    v = Math.max(0.8, Math.min(1.6, v));
    document.documentElement.style.setProperty("--font-scale", v);
    localStorage.setItem(STORAGE.fontScale, v);
  }
  setFontScale(getFontScale());

  document.getElementById("font-dec").addEventListener("click", function () {
    setFontScale(getFontScale() - 0.1);
  });
  document.getElementById("font-inc").addEventListener("click", function () {
    setFontScale(getFontScale() + 0.1);
  });

  // ---------- Settings: theme ----------
  function applyTheme(theme) {
    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    localStorage.setItem(STORAGE.theme, theme);
    document.querySelectorAll(".theme-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-theme") === theme);
    });
  }
  applyTheme(localStorage.getItem(STORAGE.theme) || "system");
  document.querySelectorAll(".theme-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyTheme(btn.getAttribute("data-theme"));
    });
  });

  // ---------- Settings panel toggle ----------
  var settingsToggle = document.getElementById("settings-toggle");
  var settingsPanel = document.getElementById("settings-panel");
  settingsToggle.addEventListener("click", function () {
    var isHidden = settingsPanel.hasAttribute("hidden");
    if (isHidden) {
      settingsPanel.removeAttribute("hidden");
    } else {
      settingsPanel.setAttribute("hidden", "");
    }
    settingsToggle.setAttribute("aria-expanded", String(isHidden));
  });

  // ---------- WIP banner ----------
  var wipBanner = document.getElementById("wip-banner");
  if (localStorage.getItem(STORAGE.wipDismissed) === "1") {
    wipBanner.setAttribute("hidden", "");
  }
  document.getElementById("wip-dismiss").addEventListener("click", function () {
    wipBanner.setAttribute("hidden", "");
    localStorage.setItem(STORAGE.wipDismissed, "1");
  });

  // ---------- Content rendering helpers ----------
  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderProse(content) {
    var paragraphs = content.split(/\n\n+/);
    return paragraphs.map(function (p) {
      p = p.trim();
      if (p === "*") {
        return '<div class="scene-break">* * *</div>';
      }
      return "<p>" + escapeHtml(p).replace(/\n/g, "<br>") + "</p>";
    }).join("\n");
  }

  function renderInlineMarkdown(str) {
    return escapeHtml(str)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
  }

  function renderSynopsisMarkdown(content) {
    var blocks = content.split(/\n\n+/);
    return blocks.map(function (block) {
      block = block.trim();
      if (!block) return "";
      if (block.indexOf("## ") === 0) {
        return '<h2 class="synopsis-subheading">' + renderInlineMarkdown(block.slice(3)) + "</h2>";
      }
      if (block.indexOf("# ") === 0) {
        return '<h1 class="synopsis-title">' + renderInlineMarkdown(block.slice(2)) + "</h1>";
      }
      return "<p>" + renderInlineMarkdown(block).replace(/\n/g, "<br>") + "</p>";
    }).join("\n");
  }

  // ---------- Views ----------
  function renderTOC() {
    document.title = "I AM — a novel by J.N.R. Quitt";
    var html = '<p class="toc-intro">A geneticist chasing the reason her mother is losing herself finds an impossible truth in a stranger\u2019s blood \u2014 and a man who has spent two thousand years learning how to disappear decides, for the first time, not to.</p>';
    html += '<a class="synopsis-link" href="#/synopsis"><span class="synopsis-link-title">Read the full synopsis</span><span class="synopsis-link-note">Major story spoilers</span></a>';

    var currentPart = null;
    CHAPTERS.forEach(function (ch, i) {
      if (ch.partLabel !== currentPart) {
        if (currentPart !== null) html += "</ul>";
        html += '<h2 class="part-heading">' + escapeHtml(ch.partLabel) + "</h2>";
        html += '<ul class="toc-list">';
        currentPart = ch.partLabel;
      }
      html += '<li class="toc-item"><a href="#/read/' + ch.id + '">' + escapeHtml(ch.title) + "</a>" +
        (ch.interlude ? '<span class="toc-tag">memory</span>' : "") + "</li>";
    });
    html += "</ul>";
    html += '<p class="toc-intro" style="margin-top:2.5rem;font-size:0.95rem;">More chapters are posted as they\u2019re finished. This is the complete manuscript so far, in reading order.</p>';

    app.innerHTML = html;
    window.scrollTo(0, 0);
  }

  function renderSynopsis() {
    document.title = "Synopsis — I AM";
    var html = "";
    html += '<div class="reader-nav-top"><a href="#/">\\u2190 Table of contents</a><span>Synopsis</span></div>';
    html += '<div class="spoiler-warning"><strong>Major spoilers:</strong> this synopsis describes the full intended story, including revelations and the ending.</div>';
    html += '<div class="synopsis-content">' + renderSynopsisMarkdown(SYNOPSIS_MARKDOWN) + "</div>";
    html += '<a class="toc-return" href="#/">Back to table of contents</a>';
    app.innerHTML = html;
    window.scrollTo(0, 0);
  }

  function findChapterIndex(id) {
    for (var i = 0; i < CHAPTERS.length; i++) {
      if (CHAPTERS[i].id === id) return i;
    }
    return -1;
  }

  function renderChapter(id) {
    var idx = findChapterIndex(id);
    if (idx === -1) {
      app.innerHTML = "<p>That chapter couldn\u2019t be found. <a href=\"#/\">Back to the table of contents</a>.</p>";
      return;
    }
    var ch = CHAPTERS[idx];
    var prev = idx > 0 ? CHAPTERS[idx - 1] : null;
    var next = idx < CHAPTERS.length - 1 ? CHAPTERS[idx + 1] : null;

    document.title = ch.title + " — I AM";
    localStorage.setItem(STORAGE.lastChapter, ch.id);

    var html = "";
    html += '<div class="reader-nav-top"><a href="#/">\u2190 Table of contents</a><span>' + (idx + 1) + " / " + CHAPTERS.length + "</span></div>";
    html += '<div class="chapter-part-label">' + escapeHtml(ch.partLabel) + "</div>";
    html += '<h1 class="chapter-title">' + escapeHtml(ch.title) + "</h1>";
    html += '<div class="chapter-content">' + renderProse(ch.content) + "</div>";
    html += '<div class="reader-nav-bottom">';
    html += prev
      ? '<a class="nav-btn prev" href="#/read/' + prev.id + '"><span class="nav-dir">\u2190 Previous</span>' + escapeHtml(prev.title) + "</a>"
      : '<span class="nav-btn prev disabled"></span>';
    html += next
      ? '<a class="nav-btn next" href="#/read/' + next.id + '"><span class="nav-dir">Next \u2192</span>' + escapeHtml(next.title) + "</a>"
      : '<span class="nav-btn next disabled"></span>';
    html += "</div>";
    html += '<a class="toc-return" href="#/">Back to table of contents</a>';

    app.innerHTML = html;
    window.scrollTo(0, 0);
  }

  // ---------- Router ----------
  function route() {
    var hash = window.location.hash || "#/";
    var readMatch = hash.match(/^#\/read\/(.+)$/);
    if (hash === "#/synopsis") {
      renderSynopsis();
    } else if (readMatch) {
      renderChapter(decodeURIComponent(readMatch[1]));
    } else {
      renderTOC();
    }
  }

  window.addEventListener("hashchange", route);
  route();
})();
