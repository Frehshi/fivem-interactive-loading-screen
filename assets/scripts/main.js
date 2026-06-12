// main.js

// -------------------------
// Key helpers (covers CEF quirks)
// -------------------------
function isF1(e) {
  return e.code === 'F1' || e.key === 'F1' || e.which === 112 || e.keyCode === 112;
}
function isF2(e) {
  return e.code === 'F2' || e.key === 'F2' || e.which === 113 || e.keyCode === 113;
}

// -------------------------
// Read more / collapse
// -------------------------
$("#read-more").on("click", function() {
  let newHeight = $(".information .description > p").height();
  $("#collapse").fadeIn(150);
  $(this).fadeOut(150);
  $(".information .description").css("height", newHeight + "px");
});

$("#collapse").on("click", function() {
  $("#read-more").fadeIn(150);
  $(this).fadeOut(150);
  $(".information .description").css("height", "");
});

// -------------------------
// Cursor follow
// -------------------------
$(document).on('mousemove', function(e) {
  $('#cursor').css({ top: e.pageY + 'px', left: e.pageX + 'px' });
});

// -------------------------
// Overlay toggle (existing config bind)
// IMPORTANT: do NOT let it conflict with F1/F2
// -------------------------
var overlay = true;
$(document).keydown(function(e) {
  // If F1/F2 pressed, we handle those ourselves (do NOT fade the overlay out)
  if (isF1(e) || isF2(e)) return;

  if (typeof Config !== "undefined" && e.which == Config.HideoverlayKeybind) {
    overlay = !overlay;
    if (!overlay) $(".overlay").css("opacity", "0");
    else $(".overlay").css("opacity", "");
  }
});

// -------------------------
// Music (ON by default)
// -------------------------
var song;

function ensureMusicPlaying() {
  if (!song) return;
  if (!song.paused) return;

  const p = song.play();
  if (p && typeof p.catch === "function") {
    p.catch(() => {
      // Autoplay might be blocked until user interaction; unlock handler will retry.
    });
  }
}

function applyMusicFromSwitch() {
  if (!song) return;
  const wantsOn = !!($("#sounds").is(":checked"));
  song.muted = !wantsOn;
  song.volume = wantsOn ? 1.0 : 0.0;

  if (wantsOn) ensureMusicPlaying();
  else song.pause();
}

// -------------------------
// Video system
// - random video picked on load (per connection)
// - F2 switches to another random video (no repeat)
// -------------------------
const videos = [
  'assets/videos/video2.mp4',
  'assets/videos/video3.mp4',
  'assets/videos/video.mp4',
];

const videoElement = document.getElementById('video');
const videoWrap = document.getElementById('videoWrap');
const soundSwitch = document.getElementById('sounds');

let currentVideoIndex = (videos.length > 0)
  ? Math.floor(Math.random() * videos.length)
  : 0;

// If autoplay-with-sound is blocked, we retry muted and then unlock on gesture
let videoNeedsUnlock = false;

function applyVideoAudioFromSwitch() {
  if (!videoElement) return;
  const wantsSound = !!(soundSwitch && soundSwitch.checked);
  videoElement.muted = !wantsSound;
  videoElement.volume = wantsSound ? 1 : 0;
}

function safePlayVideo() {
  if (!videoElement) return;

  // always try to respect the switch first
  applyVideoAudioFromSwitch();
  const wantsSound = !!(soundSwitch && soundSwitch.checked);

  const p = videoElement.play();
  if (p && typeof p.catch === "function") {
    p.catch(() => {
      // If sound autoplay blocked, retry muted BUT keep the switch ON (user wants sound)
      videoNeedsUnlock = wantsSound;

      videoElement.muted = true;
      videoElement.volume = 0;

      const p2 = videoElement.play();
      if (p2 && typeof p2.catch === "function") p2.catch(() => {});
    });
  }
}

function tryUnlockVideoAudio() {
  if (!videoElement) return;
  if (!videoNeedsUnlock) return;
  if (!(soundSwitch && soundSwitch.checked)) { videoNeedsUnlock = false; return; }

  videoElement.muted = false;
  videoElement.volume = 1;

  const p = videoElement.play();
  if (p && typeof p.catch === "function") p.catch(() => {});
  videoNeedsUnlock = false;
}

function bindUnlockGestures() {
  const unlock = () => {
    // retry both audio sources after any gesture
    if ($("#sounds").is(":checked")) ensureMusicPlaying();
    tryUnlockVideoAudio();
  };
  window.addEventListener("click", unlock, { passive: true });
  window.addEventListener("keydown", unlock, { passive: true });
}

function setVideoByIndex(index) {
  if (!videoElement) return;

  const wantsSound = !!(soundSwitch && soundSwitch.checked);
  currentVideoIndex = index;

  videoElement.pause();
  videoElement.src = videos[currentVideoIndex];
  videoElement.load();

  videoElement.addEventListener("canplay", () => {
    // restore desired audio
    videoElement.muted = !wantsSound;
    videoElement.volume = wantsSound ? 1 : 0;

    safePlayVideo();

    // keep music consistent too
    if ($("#sounds").is(":checked")) ensureMusicPlaying();
  }, { once: true });
}

function randomDifferentIndex() {
  if (videos.length <= 1) return 0;
  let next = currentVideoIndex;
  while (next === currentVideoIndex) {
    next = Math.floor(Math.random() * videos.length);
  }
  return next;
}

function nextVideoRandom() {
  setVideoByIndex(randomDifferentIndex());
}

// -------------------------
// ✅ F1 = CINEMA MODE (hide entire UI, show ONLY video)
// -------------------------
let cinemaMode = false;

function applyCinemaMode() {
  document.body.classList.toggle("cinema-mode", cinemaMode);

  // When coming BACK to UI, force overlay visible again
  if (!cinemaMode) {
    overlay = true;
    $(".overlay").css("opacity", "");
  }

  // Video should always be running
  if (videoWrap) videoWrap.style.display = "";
  safePlayVideo();
}

function toggleCinemaMode() {
  cinemaMode = !cinemaMode;
  applyCinemaMode();
}

// -------------------------
// Hotkeys
// F1: cinema mode (hide UI, only video)
// F2: switch video
// -------------------------
function hotkeyHandler(e) {
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;

  if (isF1(e)) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
    toggleCinemaMode();
    return false;
  }

  if (isF2(e)) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
    nextVideoRandom();
    return false;
  }
}

// Capture-phase listeners (best chance in NUI)
window.addEventListener('keydown', hotkeyHandler, true);
document.addEventListener('keydown', hotkeyHandler, true);
document.body && document.body.addEventListener('keydown', hotkeyHandler, true);

// Focus helpers
try { document.body.focus(); } catch {}
window.addEventListener('click', () => { try { document.body.focus(); } catch {} }, true);

// -------------------------
// Setup
// -------------------------
function setup() {
  let currentDate = new Date();

  let year = currentDate.getFullYear();
  let month = (currentDate.getMonth() + 1) < 10 ? "0" + (currentDate.getMonth() + 1) : (currentDate.getMonth() + 1);
  let day = currentDate.getDate() < 10 ? "0" + currentDate.getDate() : currentDate.getDate();
  $("#date").html(year + "-" + month + "-" + day);

  // Music (ON by default)
  if (typeof Config !== "undefined") {
    song = new Audio("assets/media/" + Config.Song);
    song.loop = true;
    song.volume = 1.0;
    song.muted = false;

    // Apply current toggle state (checked by default)
    applyMusicFromSwitch();
  }

  // Unlock gestures retry
  bindUnlockGestures();

  // Random video per connection (start immediately)
  if (videos.length > 0 && videoElement) {
    if (videoWrap) videoWrap.style.display = "";
    setVideoByIndex(currentVideoIndex);
  }

  // Switch toggles BOTH music + video audio
  $('#sounds').on("change", function() {
    applyMusicFromSwitch();
    applyVideoAudioFromSwitch();
    if ($("#sounds").is(":checked")) {
      ensureMusicPlaying();
      safePlayVideo();
    }
  });

  // -------------------------
  // ✅ OWNERSHIP STAFF (ONLY)
  // (Removed Config.Categories + carousel translateX logic)
  // -------------------------
  if (typeof Config !== "undefined" && Array.isArray(Config.Staff)) {
    Config.Staff.forEach((member, index) => {
      $(".staff .innercards").append(
        `<div class="card" data-id="${index}" style="--color: ${member.color}">
          <p class="name">${member.name}</p>
          <p class="description">${member.description}</p>
          <img class="avatar" src="${member.image}">
        </div>`
      );

      if (index < Config.Staff.length - 1) {
        $(".staff .pages").append(`<div data-id="${index}"></div>`);
      }
      $(`.staff .pages > div[data-id="0"]`).addClass("active");

      if (Config.Staff.length < 3) {
        $(".staff .pages").hide();
        $(".staff .previous").hide();
        $(".staff .next").hide();
      }
    });

    var currentPage = 0;
    $(".staff .next").on("click", function() {
      if (currentPage < Config.Staff.length - 2) {
        $(`.staff .pages > div[data-id="${currentPage}"]`).removeClass("active");
        currentPage++;
        $(`.staff .pages > div[data-id="${currentPage}"]`).addClass("active");
        $(".staff .innercards").css(
          "transform",
          `translate3d(calc(-${currentPage * 50}% - ${(currentPage+1) * .5}vw), 0, 0)`
        );
      }
    });

    $(".staff .previous").on("click", function() {
      if (currentPage > 0) {
        $(`.staff .pages > div[data-id="${currentPage}"]`).removeClass("active");
        currentPage--;
        $(`.staff .pages > div[data-id="${currentPage}"]`).addClass("active");
        $(".staff .innercards").css(
          "transform",
          `translate3d(calc(-${currentPage * 50}% - ${(currentPage+1) * .5}vw), 0, 0)`
        );
      }
    });
  }

  // start with UI visible (not cinema mode)
  applyCinemaMode();
}

// -------------------------
// Loading progress handler
// -------------------------
function loadProgress(progress) {
  $(".loader .filled-logo").css("height", progress + "%");
  $(".loader .progress").html(progress + "%");
}

window.addEventListener('message', function(e) {
  if (e.data.eventName === 'loadProgress') {
    loadProgress(parseInt(e.data.loadFraction * 100));
  }
});

setup();
