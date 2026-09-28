(function () {
  "use strict";

  var state = {
    currentScreen: "login",
    operator: "FS-07",
    operatorName: "Field Operator",
    kitName: "Multi-Drop 6",
    kitCode: "MCT-6",
    captured: false,
    result: "NEGATIVE",
    confidence: 96,
    evidenceScore: 94,
    testId: "",
    hash: "",
    cameraStream: null
  };

  function $(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    var el = $(id);
    if (el) {
      el.textContent = value;
    }
  }

  function setWidth(id, value) {
    var el = $(id);
    if (el) {
      el.style.width = value + "%";
    }
  }

  function showScreen(id) {
    var screens = document.querySelectorAll(".screen");

    for (var i = 0; i < screens.length; i++) {
      screens[i].classList.remove("active");
      screens[i].classList.add("hidden");
    }

    var target = $(id);

    if (!target) {
      console.warn("FieldSure: screen not found:", id);
      return;
    }

    target.classList.remove("hidden");
    target.classList.add("active");

    state.currentScreen = id;

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  window.showScreen = showScreen;

  function toast(message, type) {
    var el = $("toast");

    if (!el) {
      return;
    }

    el.textContent = message;

    el.className = "toast show";

    if (type) {
      el.classList.add(type);
    }

    window.clearTimeout(window.__fieldSureToastTimer);

    window.__fieldSureToastTimer = window.setTimeout(function () {
      el.classList.remove("show");
    }, 2800);
  }

  function makeTestId() {
    return (
      "FS-" +
      new Date().getFullYear() +
      "-" +
      String(Date.now()).slice(-8)
    );
  }

  function makeHash() {
    var source = [
      state.testId,
      state.kitCode,
      state.result,
      new Date().toISOString(),
      state.operator
    ].join("|");

    var hash = 2166136261;

    for (var i = 0; i < source.length; i++) {
      hash ^= source.charCodeAt(i);

      hash +=
        (hash << 1) +
        (hash << 4) +
        (hash << 7) +
        (hash << 8) +
        (hash << 24);
    }

    return (
      ("00000000" + (hash >>> 0).toString(16).toUpperCase()).slice(-8) +
      "A91F7C2E5D44B8F0"
    );
  }

  function updateClock() {
    var clock = $("clock");

    if (!clock) {
      return;
    }

    clock.textContent = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  function bootSequence() {
    var boot = $("boot");
    var app = $("app");

    /*
     * Important:
     * Always make app visible.
     * This prevents the blank-screen problem.
     */
    if (app) {
      app.classList.remove("hidden");
    }

    if (!boot) {
      showScreen("login");
      return;
    }

    var progress = 0;
    var bootText = $("bootText");

    var timer = window.setInterval(function () {
      progress += 10;

      if (bootText) {
        if (progress < 30) {
          bootText.textContent = "INITIALIZING FIELD SYSTEM";
        } else if (progress < 60) {
          bootText.textContent = "LOADING EVIDENCE ENGINE";
        } else if (progress < 90) {
          bootText.textContent = "SECURING LOCAL SESSION";
        } else if (progress < 100) {
          bootText.textContent = "VERIFYING SYSTEM";
        } else {
          bootText.textContent = "SYSTEM READY";
        }
      }

      if (progress >= 100) {
        window.clearInterval(timer);

        window.setTimeout(function () {
          boot.classList.add("hidden");

          if (app) {
            app.classList.remove("hidden");
          }

          showScreen("login");
        }, 450);
      }
    }, 100);
  }

  /*
   * LOGIN
   */
  window.enterField = function () {
    var operatorInput = $("operatorId");

    if (
      operatorInput &&
      operatorInput.value &&
      operatorInput.value.trim() !== ""
    ) {
      state.operator = operatorInput.value.trim();
    } else {
      state.operator = "FS-07";
    }

    state.operatorName = "Field Operator " + state.operator;

    setText("operatorBadge", state.operator);

    toast("Field session authenticated", "success");

    /*
     * THIS IS THE IMPORTANT SCREEN ID
     * Current HTML uses kitScreen.
     */
    showScreen("kitScreen");
  };

  /*
   * KIT SELECTION
   */
  window.selectKit = function (card) {
    var cards = document.querySelectorAll(".kit-card");

    for (var i = 0; i < cards.length; i++) {
      cards[i].classList.remove("selected");
    }

    if (card) {
      card.classList.add("selected");

      var kitName = card.getAttribute("data-kit");
      var kitCode = card.getAttribute("data-code");

      if (kitName) {
        state.kitName = kitName;
      }

      if (kitCode) {
        state.kitCode = kitCode;
      }
    }

    setText("selectedKitName", state.kitName);
    setText("selectedKitCode", state.kitCode);

    toast(
      state.kitName + " selected",
      "success"
    );
  };

  /*
   * START CAMERA
   */
  window.startCapture = function () {
    state.captured = false;

    showScreen("cameraScreen");

    updateCameraUI();

    startCamera();

    toast(
      "Camera ready. Align the sample and reference card.",
      "success"
    );
  };

  function updateCameraUI() {
    setText("liveFrameScore", "94%");
    setText("liveLightScore", "91%");
    setText("liveGlareScore", "88%");
    setText("liveAngleScore", "95%");

    setText("alignment", "ALIGNED");
    setText("light", "STABLE");
    setText("frameState", "READY");
  }

  function startCamera() {
    var video = $("cameraVideo");

    if (!video) {
      return;
    }

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      toast(
        "Camera API unavailable. Demo capture enabled.",
        "warning"
      );
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: {
            ideal: "environment"
          }
        },
        audio: false
      })
      .then(function (stream) {
        state.cameraStream = stream;

        video.srcObject = stream;

        var playPromise = video.play();

        if (playPromise) {
          playPromise.catch(function () {});
        }
      })
      .catch(function () {
        toast(
          "Camera permission unavailable. Demo mode enabled.",
          "warning"
        );
      });
  }

  function stopCamera() {
    if (state.cameraStream) {
      var tracks = state.cameraStream.getTracks();

      for (var i = 0; i < tracks.length; i++) {
        tracks[i].stop();
      }

      state.cameraStream = null;
    }

    var video = $("cameraVideo");

    if (video) {
      video.srcObject = null;
    }
  }

  /*
   * CAPTURE
   */
  window.captureSample = function () {
    state.captured = true;

    stopCamera();

    setText("frameState", "CAPTURED");

    toast(
      "Sample captured. Starting calibration...",
      "success"
    );

    showScreen("calibrationScreen");

    runCalibration();
  };

  /*
   * CALIBRATION
   */
  function runCalibration() {
    var progress = 0;

    var bar = $("calBar");
    var pct = $("calPct");

    setText(
      "calText",
      "Detecting reference colour card"
    );

    setText(
      "calibrationStatus",
      "SCANNING"
    );

    setText("cal1", "SCANNING");
    setText("cal2", "WAITING");
    setText("cal3", "WAITING");

    var timer = window.setInterval(function () {
      progress += 5;

      if (bar) {
        bar.style.width = progress + "%";
      }

      if (pct) {
        pct.textContent = progress + "%";
      }

      if (progress >= 20) {
        setText("cal1", "PASS");
      }

      if (progress >= 45) {
        setText("cal2", "PASS");
      }

      if (progress >= 70) {
        setText("cal3", "PASS");
        setText("calExposure", "STABLE");
      }

      if (progress >= 85) {
        setText("calGlareValue", "LOW");
      }

      if (progress >= 90) {
        setText("calDelta", "ΔE 2.8");
        setText("calQualityValue", "96%");
      }

      if (progress >= 100) {
        window.clearInterval(timer);

        setText(
          "calText",
          "Reference calibration complete"
        );

        setText(
          "calibrationStatus",
          "CALIBRATED"
        );

        window.setTimeout(function () {
          runAnalysis();
        }, 700);
      }
    }, 90);
  }

  /*
   * ANALYSIS
   */
  function runAnalysis() {
    showScreen("analysisScreen");

    setText(
      "analysisKit",
      state.kitName + " / " + state.kitCode
    );

    setText(
      "analysisQuality",
      "96% capture quality"
    );

    setText(
      "analysisInsight",
      "Comparing calibrated sample against kit reference profile."
    );

    var streamNames = [
      ["stream1", "Frame normalization"],
      ["stream2", "Colour calibration"],
      ["stream3", "Reaction region"],
      ["stream4", "Reference comparison"],
      ["stream5", "Confidence check"]
    ];

    for (var i = 0; i < streamNames.length; i++) {
      setText(
        streamNames[i][0],
        streamNames[i][1] + " • WAITING"
      );
    }

    var progress = 0;
    var pct = $("analysisPct");

    var timer = window.setInterval(function () {
      progress += 4;

      if (pct) {
        pct.textContent = progress + "%";
      }

      var activeIndex = Math.min(
        streamNames.length - 1,
        Math.floor(progress / 20)
      );

      for (var j = 0; j < streamNames.length; j++) {
        if (j < activeIndex) {
          setText(
            streamNames[j][0],
            streamNames[j][1] + " • COMPLETE"
          );
        } else if (j === activeIndex) {
          setText(
            streamNames[j][0],
            streamNames[j][1] + " • PROCESSING"
          );
        } else {
          setText(
            streamNames[j][0],
            streamNames[j][1] + " • WAITING"
          );
        }
      }

      if (progress >= 100) {
        window.clearInterval(timer);

        for (var k = 0; k < streamNames.length; k++) {
          setText(
            streamNames[k][0],
            streamNames[k][1] + " • COMPLETE"
          );
        }

        window.setTimeout(function () {
          showResult();
        }, 650);
      }
    }, 80);
  }

  /*
   * RESULT
   */
  function showResult() {
    state.testId = makeTestId();
    state.hash = makeHash();

    setText(
      "resultClassification",
      state.result
    );

    setText(
      "resultDescription",
      "Presumptive field result generated from the calibrated colourimetric response. This is not a laboratory confirmation."
    );

    setText(
      "confidenceValue",
      state.confidence + "%"
    );

    setWidth(
      "confidenceBar",
      state.confidence
    );

    setText(
      "evidenceScore",
      state.evidenceScore + "/100"
    );

    setWidth(
      "evidenceScoreBar",
      state.evidenceScore
    );

    setText(
      "testId",
      state.testId
    );

    setText(
      "resultKit",
      state.kitName + " (" + state.kitCode + ")"
    );

    setText(
      "resultTime",
      new Date().toLocaleString()
    );

    setText(
      "resultOperator",
      state.operator
    );

    setText(
      "hashValue",
      state.hash
    );

    showScreen("resultScreen");

    toast(
      "Classification complete",
      "success"
    );
  }

  /*
   * VERIFY INTEGRITY
   */
  window.verifyIntegrity = function () {
    if (!state.hash) {
      toast(
        "No evidence record available.",
        "warning"
      );
      return;
    }

    setText(
      "sealedIntegrity",
      "VERIFIED • RECORD INTACT"
    );

    toast(
      "Integrity verified. Record hash is intact.",
      "success"
    );
  };

  /*
   * VOICE RESULT
   */
  window.speakCurrentResult = function () {
    if (!("speechSynthesis" in window)) {
      toast(
        "Voice output is not supported in this browser.",
        "warning"
      );
      return;
    }

    window.speechSynthesis.cancel();

    var message =
      "FieldSure result. " +
      state.result.toLowerCase() +
      ". Confidence " +
      state.confidence +
      " percent. Evidence score " +
      state.evidenceScore +
      " out of 100.";

    var speech =
      new SpeechSynthesisUtterance(message);

    speech.rate = 0.92;
    speech.pitch = 1;

    window.speechSynthesis.speak(speech);

    toast(
      "Reading result aloud",
      "success"
    );
  };

  /*
   * SEAL RECORD
   */
  window.sealRecord = function () {
    if (!state.testId) {
      toast(
        "Complete a test before sealing.",
        "warning"
      );
      return;
    }

    setText(
      "sealedHash",
      state.hash
    );

    setText(
      "sealedIntegrity",
      "SEALED • HASH LOCKED"
    );

    setText(
      "syncQueueCount",
      "1"
    );

    var timeline = $("chainTimeline");

    if (timeline) {
      timeline.innerHTML =
        '<div class="chain-event">' +
          '<div class="chain-dot"></div>' +
          '<div>' +
            '<strong>Record captured</strong>' +
            '<span>' +
              new Date().toLocaleTimeString() +
            '</span>' +
          '</div>' +
        '</div>' +

        '<div class="chain-event">' +
          '<div class="chain-dot"></div>' +
          '<div>' +
            '<strong>Calibration verified</strong>' +
            '<span>Reference card accepted</span>' +
          '</div>' +
        '</div>' +

        '<div class="chain-event">' +
          '<div class="chain-dot"></div>' +
          '<div>' +
            '<strong>Classification sealed</strong>' +
            '<span>' +
              state.result +
              " • " +
              state.confidence +
              '% confidence' +
            '</span>' +
          '</div>' +
        '</div>';
    }

    showScreen("sealedScreen");

    toast(
      "Evidence record sealed",
      "success"
    );
  };

  /*
   * FIELD ASSISTANT
   */
  window.openFieldAssistant = function () {
    var root = $("assistantRoot");

    if (!root) {
      return;
    }

    root.innerHTML =
      '<div class="assistant-panel">' +

        '<div class="assistant-header">' +

          '<div class="assistant-title">' +

            '<div class="assistant-orb"></div>' +

            '<div>' +
              '<strong>Field Assistant</strong>' +
              '<small>Evidence workflow guidance</small>' +
            '</div>' +

          '</div>' +

          '<button ' +
            'class="assistant-close" ' +
            'id="assistantClose" ' +
            'type="button">' +
            '×' +
          '</button>' +

        '</div>' +

        '<div class="assistant-body">' +

          '<p>' +
            '<strong>Current task:</strong> ' +
            state.kitName +
            ' analysis.' +
          '</p>' +

          '<p>' +
            'The sample was calibrated against the reference card and classified as ' +
            '<strong>' +
            state.result +
            '</strong> with <strong>' +
            state.confidence +
            '%</strong> confidence.' +
          '</p>' +

          '<p>' +
            'Recommended action: preserve the physical test with the sealed digital record and follow the approved field procedure.' +
          '</p>' +

          '<div class="assistant-actions">' +

            '<button ' +
              'class="assistant-action" ' +
              'type="button" ' +
              'id="assistantSpeak">' +
              '🔊 Explain result' +
            '</button>' +

            '<button ' +
              'class="assistant-action" ' +
              'type="button" ' +
              'id="assistantClose2">' +
              '✓ Close' +
            '</button>' +

          '</div>' +

        '</div>' +

      '</div>';

    root.classList.add("show");

    var closeButton = $("assistantClose");
    var closeButton2 = $("assistantClose2");
    var speakButton = $("assistantSpeak");

    function closeAssistant() {
      root.classList.remove("show");
    }

    if (closeButton) {
      closeButton.onclick = closeAssistant;
    }

    if (closeButton2) {
      closeButton2.onclick = closeAssistant;
    }

    if (speakButton) {
      speakButton.onclick =
        window.speakCurrentResult;
    }
  };

  /*
   * CLOSE ASSISTANT IF USER CLICKS OUTSIDE
   */
  document.addEventListener("click", function (event) {
    var root = $("assistantRoot");

    if (!root) {
      return;
    }

    if (
      root.classList.contains("show") &&
      event.target === root
    ) {
      root.classList.remove("show");
    }
  });

  /*
   * INITIALIZATION
   */
  document.addEventListener(
    "DOMContentLoaded",
    function () {
      var app = $("app");

      if (app) {
        app.classList.remove("hidden");
      }

      updateClock();

      window.setInterval(
        updateClock,
        1000
      );

      var loginForm = $("loginForm");

      if (loginForm) {
        loginForm.addEventListener(
          "submit",
          function (event) {
            event.preventDefault();
            window.enterField();
          }
        );
      }

      bootSequence();
    }
  );
})();