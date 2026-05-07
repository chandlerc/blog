+++
title = "Carbon: graduating from the experiment"
outputs = ["Reveal"]
date = "2026-05-07"

[reveal_hugo]
total_time = 3000
+++
<style>
.reveal h1.title {
    font-size: 2.8em;
}

.reveal h1.arrow {
    padding-top: 50px;
    padding-bottom: 50px;
    font: var(--r-code-font);
    font-size: 6.5em;
}

.reveal h1.arrow_long {
    padding-top: 50px;
    padding-bottom: 50px;
    font: var(--r-code-font);
    font-size: 1.25em;
}

.hana-grid {
display: grid;
height: 100vh;
width: 100vw;
grid-template-columns: repeat(6 1fr);
grid-template-rows: auto [arrow] 200px [field] max-content;
> * {
    align-self: center;
}

.left, .center, .right {
    grid-column-end: span 2;
    align-self: start;
}

.left {
    text-align: left;
}

.center {
    text-align: center;
}

.right {
    text-align: right;
}

.less-tightly, .more-tightly {
    text-align: left;
    grid-column-end: span 3;
}

.crab {
    font-size: 90px;
    grid-column: span 1;
    position: relative;
    top: -0.25em;
}
.question {
    grid-column: span 2;
    text-align: right;
    /*font-size: 64px;*/
    /* for some reason the questions is wider than 1fr */
}

.rust {
    align-items: center;
    grid-column: span 2;
}
.rust-with-arrow {
    text-align: left;
    grid-column: span 3;
}
.carbon-with-arrow {
    text-align: right;
    grid-column: span 3;
}

.arrow {
    grid-column: span 6;
    grid-row: "arrow";
    text-align: center;
    img {
    height: 150px;
    }
}

.greenfield, .brownfield {
    align-items: center;
    grid-row: "field";
}
.greenfield {
    grid-column-end: span 3;
    text-align: left;
}
.brownfield {
    grid-column-end: span 3;
    text-align: right;
}

</style>

<div class="r-stretch" style="display: flex; flex-direction: column; justify-content: center">

# Carbon: graduating from the experiment {.title}

</div>
<div class="col-container"><div class="col-4">

#### Chandler Carruth <br/> @chandlerc1024 <br/> chandlerc@{google,gmail}.com

</div><div class="col right">

#### NDC Toronto 2026

</div></div>
<div class="right">

https://chandlerc.blog/slides/2026-ndc-toronto-carbon-update

</div>

{{% note %}}


{{% /note %}}

<script>
document.addEventListener('DOMContentLoaded', () => {
  const checkReveal = setInterval(() => {
    if (window.Reveal && typeof window.Reveal.addKeyBinding === 'function') {
      clearInterval(checkReveal);
      setupTimerPiP();
    }
  }, 100);

  function setupTimerPiP() {
    Reveal.addKeyBinding({
      keyCode: 84, // 'T'
      key: 'T',
      description: 'Open Timer PiP'
    }, () => {
      openTimerPiP();
    });
  }

  async function openTimerPiP() {
    if (!('documentPictureInPicture' in window)) {
      alert('Document Picture-in-Picture is not supported in this browser.');
      return;
    }

    if (window.timerPipWindow) {
      window.timerPipWindow.close();
    }

    const pipWindow = await window.documentPictureInPicture.requestWindow({
      width: 250,
      height: 150,
    });

    window.timerPipWindow = pipWindow;

    const style = pipWindow.document.createElement('style');
    style.textContent = `
      body {
        font-family: 'Courier New', Courier, monospace; /* Monospace for stable width */
        background: #111;
        color: #eee;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
        box-sizing: border-box;
        border: 1px solid #333;
      }
      .remaining, .elapsed {
        font-size: 3.5em;
        line-height: 1;
        display: flex;
        align-items: center;
      }
      .remaining {
        font-weight: 800;
      }
      .elapsed {
        font-weight: 500;
        color: #ccc;
        cursor: pointer;
        margin-top: 10px;
        transition: color 0.2s;
      }
      .elapsed:hover {
        color: #00d2ff;
      }
      .ahead {
        color: #00e676;
      }
      .behind {
        color: #ff1744;
      }
      .dim {
        opacity: 0.3;
      }
      .time {
        font-size: 0.8em;
        color: #666;
        margin-top: 20px; /* Fixed margin instead of absolute positioning */
      }
    `;
    pipWindow.document.head.appendChild(style);

    const elapsedDiv = pipWindow.document.createElement('div');
    elapsedDiv.className = 'elapsed';
    elapsedDiv.title = 'Click to reset timer';
    
    const remainingDiv = pipWindow.document.createElement('div');
    remainingDiv.className = 'remaining';
    
    const timeDiv = pipWindow.document.createElement('div');
    timeDiv.className = 'time';

    // Put remaining on top
    pipWindow.document.body.appendChild(remainingDiv);
    pipWindow.document.body.appendChild(elapsedDiv);
    pipWindow.document.body.appendChild(timeDiv);

    let startTime = Date.now();
    const totalTime = 3000; // 50 minutes

    elapsedDiv.addEventListener('click', () => {
      startTime = Date.now();
    });

    function formatTimer(mins, secs, sign = '') {
      const minsStr = mins.toString().padStart(2, '0');
      const secsStr = secs.toString().padStart(2, '0');
      
      let result = '';
      if (sign) {
        result += `<span>${sign}</span>`;
      } else {
        result += `<span style="visibility: hidden">+</span>`;
      }
      
      if (minsStr[0] === '0') {
        result += `<span class="dim">0</span><span>${minsStr[1]}</span>`;
      } else {
        result += `<span>${minsStr}</span>`;
      }
      
      result += `<span>:</span><span>${secsStr}</span>`;
      return result;
    }

    function update() {
      const now = new Date();
      timeDiv.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const elapsedSecs = Math.floor((Date.now() - startTime) / 1000);
      const elapsedMins = Math.floor(elapsedSecs / 60);
      const elapsedSecsRemainder = elapsedSecs % 60;
      
      elapsedDiv.innerHTML = formatTimer(elapsedMins, elapsedSecsRemainder);

      const slideProgress = window.Reveal ? window.Reveal.getProgress() : 0;
      const timeProgress = elapsedSecs / totalTime;
      const pace = slideProgress - timeProgress;
      const paceSecs = Math.round(pace * totalTime);

      if (paceSecs >= 0) {
        const paceMins = Math.floor(paceSecs / 60);
        const paceSecsRemainder = paceSecs % 60;
        remainingDiv.innerHTML = formatTimer(paceMins, paceSecsRemainder, '+');
        remainingDiv.classList.remove('behind');
        remainingDiv.classList.add('ahead');
      } else {
        const behindSecs = -paceSecs;
        const behindMins = Math.floor(behindSecs / 60);
        const behindSecsRemainder = behindSecs % 60;
        remainingDiv.innerHTML = formatTimer(behindMins, behindSecsRemainder, '-');
        remainingDiv.classList.remove('ahead');
        remainingDiv.classList.add('behind');
      }
    }

    const intervalId = pipWindow.setInterval(update, 1000);
    update();

    pipWindow.addEventListener('pagehide', () => {
      clearInterval(intervalId);
      window.timerPipWindow = null;
    });
  }
});
</script>
