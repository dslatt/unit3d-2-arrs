// ==UserScript==
// @name         UNIT3D-to-Sonarr
// @version      0.2.2
// @author       dantayy
// @namespace    https://github.com/frenchcutgreenbean/
// @description  Send series to sonarr from UNIT3D trackers
// @icon         https://i.ibb.co/jvZ2QFH/download-icon-sonarr-1331550893356635526-0.png
// @match        *://fearnopeer.com/*
// @match        *://aither.cc/*
// @match        *://blutopia.cc/*
// @match        *://utp.to/* 
// @updateURL    https://github.com/frenchcutgreenbean/unit3d-2-arrs/raw/main/unit3d-to-sonarr.user.js
// @downloadURL  https://github.com/frenchcutgreenbean/unit3d-2-arrs/raw/main/unit3d-to-sonarr.user.js
// @require      https://cdn.jsdelivr.net/gh/sizzlemctwizzle/GM_config@43fd0fe4de1166f343883511e53546e87840aeaf/gm_config.js
// @require      https://code.jquery.com/jquery-3.5.1.min.js
// @grant        GM.xmlHttpRequest
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.openInTab
// @grant        GM.notification
// @grant        GM.registerMenuCommand
// @grant        GM_addStyle
// ==/UserScript==

/*
==================================================================================================
Based on the ptp2radarr script.
All credit to the original authors @ PTP DirtyCajunrice + CatSpinner + Prism16 
==================================================================================================
*/

/*jshint esversion: 11 */
(function () {
  "use strict";
  const icon = "https://raw.githubusercontent.com/walkxcode/dashboard-icons/refs/heads/main/svg/sonarr.svg";

  GM_config.init({
    id: "UNIT3DToSonarr",
    title: "UNIT3DToSonarr Settings",
    css: `
        #UNIT3DToSonarr {background: #333333; margin: 0; padding: 20px 20px}
        #UNIT3DToSonarr .field_label {color: #fff; width: 100%;}
        #UNIT3DToSonarr .config_header {color: #fff; padding-bottom: 10px; font-weight: 100;}
        #UNIT3DToSonarr .reset {color: #e8d3d3; text-decoration: none;}
        #UNIT3DToSonarr .config_var {display: flex; flex-direction: row; text-align: left; justify-content: center; align-items: center; width: 85%; margin: 4px auto; padding: 4px 0; border-bottom: 1px solid #7470703d;}
        #UNIT3DToSonarr_buttons_holder { display: grid; gap: 4px; grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(3, 1fr); max-width: 85%; height: 100px; margin: 0 auto; text-align: center; align-items: center;}
        #UNIT3DToSonarr_saveBtn { grid-column: 1; grid-row: 2;}
        #UNIT3DToSonarr_closeBtn { grid-column: 2;  grid-row: 2;}
        #UNIT3DToSonarr_buttons_holder button,#UNIT3DToSonarr_buttons_holder input { cursor: pointer; padding: 2px 5px !important; margin: 0 !important;}
        #UNIT3DToSonarr .reset_holder { grid-column: 1 / 3;  grid-row: 3;}
        #UNIT3DToSonarr .config_var input[type="checkbox"] { cursor: pointer;}
        #UNIT3DToSonarr_field_sonarr_syncbutton { grid-column: 1; grid-row: 1;}
        #UNIT3DToSonarr_field_sonarr_fetchbutton { grid-column: 2; grid-row: 1;}
            `,

    fields: {
      sonarr_url: {
        label: "Sonarr URL",
        type: "text",
        default: "https://domain.tld/sonarr",
      },
      sonarr_apikey: {
        label: "Sonarr API Key",
        type: "text",
        default: "",
      },
      enableAuth: {
        label: "Enable Sonarr Auth",
        type: "checkbox",
        default: false,
      },
      username: {
        label: "Username",
        type: "text",
        default: "",
        hidden: true,
      },
      password: {
        label: "Password",
        type: "text",
        default: "",
        hidden: true,
      },
      sonarr_monitored: {
        label: "Add monitored",
        type: "checkbox",
        default: true,
      },
      sonarr_profileid: {
        label: "Sonarr Quality Profile ID",
        type: "text",
        default: "1",
      },
      sonarr_rootfolderpath: {
        label: "Sonarr Root Folder Path",
        type: "text",
        default: "/mnt/tv",
      },
      sonarr_searchforseries: {
        label: "Search for series on request",
        type: "checkbox",
        default: false,
      },
      sonarr_sync_interval: {
        label: "AutoSync Interval (Minutes)",
        type: "select",
        options: ["15", "30", "60", "120", "360", "1440", "Never"],
        default: "Never",
      },
      sonarr_syncbutton: {
        label: "Sync Sonarr Series",
        type: "button",
        click: get_sonarr_series,
      },
      sonarr_fetchbutton: {
        label: "Fetch Quality Profiles",
        type: "button",
        click: fetchQualityProfiles,
      },
    },
    events: {
      open: function (doc) {
        const enableAuth = GM_config.fields.enableAuth.node;
        toggleAuthFields(enableAuth.checked);
        enableAuth.addEventListener("change", function () {
          toggleAuthFields(enableAuth.checked);
        });

        let style = this.frame.style;
        style.width = "400px";
        style.height = "515px";
        style.inset = "";
        style.top = "6%";
        style.right = "6%";
        doc
          .getElementById("UNIT3DToSonarr_buttons_holder")
          .prepend(
            doc.getElementById("UNIT3DToSonarr_sonarr_syncbutton_var"),
            doc.getElementById("UNIT3DToSonarr_sonarr_fetchbutton_var")
          );
      },
      save: function () {
        console.log("Save event triggered");
        getMainVars();
        alert("Settings Saved!");
      },
    },
  });

  function toggleAuthFields(isAuthEnabled) {
    const usernameField = GM_config.fields.username.wrapper;
    const passwordField = GM_config.fields.password.wrapper;
    usernameField.style.display = isAuthEnabled ? "" : "none";
    passwordField.style.display = isAuthEnabled ? "" : "none";
  }

  GM.registerMenuCommand("UNIT3DToSonarr Settings", () => GM_config.open());

  let sonarr_apikey,
    enableAuth,
    username,
    password,
    monitored,
    sonarrUrl,
    qualityProfile,
    rootPath,
    searchOnAdd,
    headers;

  // Function to set global MainVars
  function getMainVars() {
    // Constant variables based on GM_config settings used across functions.
    sonarr_apikey = GM_config.get("sonarr_apikey");
    enableAuth = GM_config.get("enableAuth");
    username = GM_config.get("username");
    password = GM_config.get("password");
    monitored = GM_config.get("sonarr_monitored");
    sonarrUrl = GM_config.get("sonarr_url").replace(/\/$/, "");
    qualityProfile = GM_config.get("sonarr_profileid");
    rootPath = GM_config.get("sonarr_rootfolderpath");
    searchOnAdd = GM_config.get("sonarr_searchforseries");
    headers = {
      "X-Api-Key": sonarr_apikey,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    // Add basic auth to the headers if enabled.
    if (enableAuth) {
      headers["Authorization"] = "Basic " + btoa(username + ":" + password);
    }
  }

  // Call the function to set the MainVars
  getMainVars();

  let current_page_type = "";
  let oldSelection = undefined;
  const isSimilar = window.location.href.includes("similar");
  const isRequest = window.location.href.includes("request");

  if (document.querySelector("section.meta") && !isRequest) {
    current_page_type = "singletorrent";
  } else if (document.querySelector("section.meta") && isRequest) {
    current_page_type = "request";
  } else if (window.location.href.includes("torrent")) {
    current_page_type = "multi";
  }
  if (current_page_type) {
    set_html(false);
  }
  let interval = GM_config.get("sonarr_sync_interval");
  if (interval != "Never") {
    let millisecondInterval = Number(interval) * 60000;
    window.setTimeout(() => autoSync(millisecondInterval));
    window.setInterval(
      () => autoSync(millisecondInterval),
      millisecondInterval
    );
  }

  function clickswap(imdbid, titleSlug) {
    let button = document.getElementById("UNIT3DToSonarr-" + imdbid);
    button.firstChild.src =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAAAAAAAAQCEeRdzAAAE/klEQVR4nJVVa0wbVBTun+k//rn4QzNFs1EeLbS0vB9jUF7jsUjcIyCvBdh4Bn9IpVBgHS/RZbrgNrM4FiA8BCZUXgERnTEm+zMmEoKWuPEqG5QCbXl/nnsDyGtsnuS0t733fufcc75zjkBwiDiQKJVKVWtra/fQ0NCTmZmZtdnZ2fXh4eExrVbbq1KpCpxIDsM4UGxIqqur6wlsdWVlBRaLBfPz86DfXNma/cf25ubm1hsaGu4zZ14J3MvLN16v189tXt4GfZEaDAYsLy/T9+xiSEjYpUPB33D0UvoEXkBNbRMsZjO//DIDTC0WMzo7exEQHoejEt/CA8HFImmC8+kE2MYqIfMIR9W9eiwtWWA0Gl8IbKQXLi8vQavtgodfFGw+UkIaShhC8e6X2NraCp88fbpQVFgBe79zEJIRF/fTuPZ5JcbGJriHTM1mE1f2OvZ7akqPb25VwcPnDGzojv3Js8jMzMXfulGTWCz+Lye1tbUta2trPObq/DI4+J3Fu8pbsFfEICIsGoVXr6GawtbyfQfX2roWFJd9hagzsbAjj98uqILINwppaTmY0uuxsb6O+vr6Ng4uEonEFOs1Fm8WDmYkO12Jd5KuwKphEOKwREhlgZCQyiT+kEn9+VrirIBDRBKsvhuCdYIaSQmZHHyBGMawGLuIwRIB8VzNGLMV18XFBTz+40/4eYXh/YzP8F7O1/CWB0AeFA1hchHpFb72litwgvaPX7rKzz4aGITJtLiNwzDz8/M1AiqiHsbpnclbWFhAakYuZOSpp1sw7ONVeL3nGQSPwPW13uewS8yDl2sQnVEgLSuPO7YTw0x56ujo+FkwODj4z84i2qLdF9dvUxgCydsYDigYIPCHmzrAjMxAFhzDz5RVVPI7uxhG4dbpdM8EVP7rB/H6zt06ODv5wYZCwD1/uEfJiM3lYkjpzJc37uwzsFWEAvrY2GeAnvct1QE3QCC7vN9pILUEUseXGBgZGZncW0zscOXNKs4UWUgsjvQZdhuhFx35aQ6y0FgeopLyG/sMMDaOjo4+F7S3t/ezhOxOkAm5+eWcnowttkmFHJAbeUzg/UbOKLbnLA9CaqaKE2Nvkru6uh4I1Gq1ZidNjcY5jE9MIjI8GqLIFAgpB14uVAOhcTiRXk7ULOdrT7cQHCu4B8fIZCj8P8DIX7pdHZdhFhUVlQokEomUnrOx1dhYb7l98y7sguN4EdmkaODqEgyZnFRyiivz2sU1GMfTymDVOARbOltWep33LoazWbQbMhJezY2NjT+wlsviqNV2w8M7Em8V1cA6WQM35wBERF1E0uVPkJmtRubHBUhJ+xRR51LgIQ+EdWIBjuXdgYtHGGpqmjgGw2pubu7c7kVsWFA/N3d2/rjZFXMgon4UfT4J3T39mJycwjwRgcV5kZSFYnp6Gr88+J23CNHJD3mDlHtGoK7+PiXYYNk36WhYpASEx/OWyzpqepoSE5OT3CPGCHJgD0sMnAxUR1DlFsPu1HkIyTHfoAtQKEIyDpwJR5181NLQeGRlqaDXT5PH8/u4vW8m0MsMZEytLoM0/CLedPYrPXSqCWlY6HSji+vUcl9lorEzq6urrJMuyWTu2YeCb4mjo6OoqampjcWa0Y1xeud8ZqAmk4nvsby0tbV1yeWbjPk/IifRaDSlPT09v46NjRm3KDg+Pj7f19f3W0lJSYWbm5v7YRj/An8cf5ZA2dAQAAAAAElFTkSuQmCC";
    button.removeEventListener("click", new_series_lookup, false);
    button.addEventListener(
      "click",
      function () {
        GM.openInTab(sonarrUrl.concat("/series/", titleSlug), "active");
      },
      false
    );
  }

  function set_html(update) {
    // Select all the series: category "1"
    let listViewSeries = document.querySelectorAll(
      'tr[data-imdb-id][data-category-id="2"]'
    );
    oldSelection = listViewSeries;
    if (update) {
      let buttons = document.querySelectorAll('[id^="UNIT3DToSonarr-tt"]');
      if (buttons.length === 0) {
        return;
      }
      buttons.forEach((button) => {
        window.setTimeout(function () {
          button.parentNode.removeChild(button);
        });
      });
    }
    if (current_page_type == "singletorrent") {
      let catSelector = document.querySelector(
        '[href*="/torrents/create?category_id="]'
      );
      let category = catSelector.href.match(/=(\d+)/)[1];
      if (category === "2") {
        let a = document.querySelector('[href*="://www.imdb.com/title/tt"]');
        let id = a.href.match(/tt\d+/)[0];
        let series = document.querySelector(".meta__ids");
        if (id) {
          buttonBuilder(series, id, "single");
        }
      }
    } else if (current_page_type === "request") {
      let a = document.querySelector('[href*="://www.themoviedb.org/"]');
      let id = a.href.match(/\.org\/(.*)\//)[1];
      if (id == "tv") {
        let series = document.querySelector(".meta__ids");
        buttonBuilder(series, id, "single");
      }
    } else if (current_page_type == "multi") {
      listViewSeries.forEach((series) => {
        window.setTimeout(() => {
          let id = series.getAttribute("data-imdb-id");
          if (id) {
            buttonBuilder(series, id, "list");
          }
        });
      });
    }
  }

  setInterval(function () {
    if (oldSelection) {
      let newSelection = document.querySelectorAll(
        'tr[data-imdb-id][data-category-id="2"]'
      );
      if (newSelection[0] !== oldSelection[0]) {
        set_html(false);
      }
    }
  }, 1000);

  // UNIT3D saves imdb in the attribute data-imdb-id but seem to trim the excess 0s from tt0000001
  function padImdbId(imdbId) {
    imdbId = String(imdbId);
    let paddedImdbId;
    if (imdbId.length < 7) {
      const zerosToAdd = 7 - imdbId.length;
      paddedImdbId = "0".repeat(zerosToAdd) + imdbId;
    } else paddedImdbId = imdbId;
    return paddedImdbId;
  }

  async function buttonBuilder(series, id, type) {
    let imdbid = id.includes("tt") ? id : "tt" + padImdbId(id);
    let exists = await check_exists(imdbid);
    let button = document.createElement("img");
    button.id = "UNIT3DToSonarr-" + imdbid;
    button.className = "sonarr-button";
    button.type = type;
    button.src = icon;

    let listStyler = `
    img.sonarr-button {
        padding: 14px;
        margin: 0;
        all: unset;
        width: 13px;
        height: 13px;
        cursor: pointer;
        opacity: 1;
        transition: all .1s;
    }
    img.sonarr-button:hover {
        filter: brightness(0.4) !important;
    }
    `;
    const singleStyler = ` 
    img.sonarr-button {
        width: 23px;
        position: relative;
        top: 2px;
    }
    `;

    if (type == "single") {
      let meta__sonarr = document.createElement("li");
      meta__sonarr.className = "meta__sonarr";
      let meta_id_tag = document.createElement("a");
      meta_id_tag.className = "meta-id-tag";
      meta_id_tag.href = "#";
      meta_id_tag.append(button);
      meta__sonarr.append(meta_id_tag);
      series.append(meta__sonarr);

      GM_addStyle(singleStyler);
    } else if (type == "list") {
      let buttonDiv = series.querySelector(".torrent-search--list__buttons");
      buttonDiv.append(button);

      GM_addStyle(listStyler);
    }
    if (exists) {
      button.style.filter = "drop-shadow(#36c6f4 0px 0px 5px)";
      button.addEventListener(
        "click",
        function () {
          GM.openInTab(
            sonarrUrl.concat("/series/", exists[0].titleSlug),
            "active"
          );
        },
        false
      );
    } else {
      $(button).click(function () {
        $(button).animate({ opacity: 0 }, 500, function () {
          button.textContent = "...";
          $(button).animate({ opacity: 1 }, 1000);
        });

        new_series_lookup(imdbid)
          .then(() => {
            button.style.filter = "drop-shadow(#36c6f4 0px 0px 5px)";
          })
          .catch((error) => {
            console.error(error);
          });
      });
    }
  }

  // Helper function to make xmlHTTPRequest return a promise
  function GM_xmlHttpRequest_promise(details) {
    return new Promise((resolve, reject) => {
      GM.xmlHttpRequest({
        ...details,
        onload: function (response) {
          resolve(response);
        },
        onerror: function (error) {
          reject(error);
        },
        onabort: function () {
          reject(new Error("Request aborted"));
        },
      });
    });
  }

  function errorNotificationHandler(error, expected, errormsg) {
    let prestring = "UNIT3DToSonarr::";
    if (expected) {
      console.log(prestring + "Error: " + errormsg + " Actual Error: " + error);
      GM.notification("Error: " + errormsg);
    } else {
      console.log(
        prestring +
          "Unexpected Error: Please report this error in the forum. Actual Error: " +
          error
      );
      GM.notification(
        "Unexpected Error: Please report this error in the forum. Actual Error: " +
          error
      );
    }
  }

  function fetchQualityProfiles() {
    if (!sonarrUrl || !sonarr_apikey) {
      GM.notification({
        title: "UNIT3DtoSonarr",
        text: "Please Check API Key & URL In Settings.",
        timeout: 4000,
      });
      return;
    }

    return GM_xmlHttpRequest_promise({
      method: "GET",
      url: `${sonarrUrl}/api/v3/qualityprofile?apikey=${sonarr_apikey}`,
      headers: headers,
    })
      .then((response) => {
        const responseJSON = JSON.parse(response.responseText);
        if (response.status == 200) {
          let output = {};
          for (const { name, id } of responseJSON) {
            output[name] = id;
          }
          if (output) {
            let modal = createModal(output);
            document.body.append(modal);
          } else {
            GM.notification({
              title: "UNIT3DtoSonarr",
              text: "Something went wrong could not find quality profiles",
              timeout: 4000,
            });
          }
        } else {
          reject(`Error: ${response.status}`);
        }
      })
      .catch((error) => {
        GM.notification({
          text: "Request Error.\nCheck Sonarr URL!",
          title: "UNIT3DToSonarr",
          timeout: 3000,
        });
        throw error;
      });
  }

  function createModal(obj) {
    const modalStyler = `
            .sonarr-modal {
                position: fixed;
                border-radius: 5px;
                z-index: 1;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                overflow: auto;
                background-color: rgba(0,0,0,0.4);
            }
            .sonarr-modal-content {
                background-color: #1C1C1C;
                color: #CCCCCC;
                margin: 15% auto;
                padding: 20px;
                width: 80%;
                max-width: 300px;
                position: relative;
            }
            .sonarr-close {
                background-color : transparent;
                color: #BBBBBB;
                position: absolute;
                top: 0px;
                right: 0px;
                padding: 5px;
                border: 0;
                cursor: pointer;
                transition: all 0.1;
            }
            .sonarr-close:hover {
                opacity: 0.8;
            }
        `;
    let modal = document.createElement("div");
    modal.className = "sonarr-modal";

    let modalContent = document.createElement("div");
    modalContent.className = "sonarr-modal-content";

    let closeButton = document.createElement("button");
    closeButton.className = "sonarr-close";
    closeButton.textContent = "Close";

    GM_addStyle(modalStyler);
    closeButton.onclick = function () {
      modal.style.display = "none";
    };
    modalContent.append(closeButton);

    let tree = createTree(obj);
    tree.style.textAlign = "left";

    modalContent.append(tree);
    modal.append(modalContent);

    document.body.append(modal);
  }

  function createTree(obj) {
    let ul = document.createElement("ul");
    ul.style.listStyleType = "none";
    for (let key in obj) {
      let li = document.createElement("li");
      let span = document.createElement("span");
      span.textContent = key;
      li.appendChild(span);
      if (typeof obj[key] == "object" && obj[key] !== null) {
        let child = createTree(obj[key]);
        li.appendChild(child);
        span.onclick = function () {
          child.hidden = !child.hidden;
        };
        if (Array.isArray(obj)) {
          span.textContent = "[" + span.textContent + "]";
        } else {
          span.textContent = "{" + span.textContent + "}";
        }
      } else {
        let text = document.createTextNode(": " + obj[key]);
        li.appendChild(text);
      }
      ul.appendChild(li);
    }
    return ul;
  }

  function get_sonarr_series() {
    return GM_xmlHttpRequest_promise({
      method: "GET",
      url: sonarrUrl.concat("/api/v3/series"),
      headers: headers,
    })
      .then((response) => {
        const responseJSON = JSON.parse(response.responseText);
        if (response.status == 200) {
          GM.setValue("existing_seriess", JSON.stringify(responseJSON));
          let timestamp = +new Date();
          GM.setValue("last_sync_timestamp", timestamp);
          console.log(
            "UNIT3DToSonarr::Sync: Setting last sync timestamp to " + timestamp
          );
          GM.notification({
            text: "Sonarr Sync Complete!",
            title: "UNIT3DToSonarr",
            timeout: 4000,
          });
          set_html(true);
        } else if (response.status == 401) {
          GM.notification({
            text: "Error: Invalid API Key!",
            title: "UNIT3DToSonarr",
            timeout: 4000,
          });
        } else {
          GM.notification({
            text: `Error: ${response.status}`,
            title: "UNIT3DToSonarr",
            timeout: 4000,
          });
        }
      })
      .catch((error) => {
        GM.notification({
          text: "Request Error.\nCheck Sonarr URL!",
          title: "UNIT3DToSonarr",
          timeout: 3000,
        });
        throw error;
      });
  }

  async function check_exists(imdbid) {
    let seriesliststr = await GM.getValue("existing_seriess", "{}");
    let series_list = JSON.parse(seriesliststr);
    let filter = null;
    try {
      filter = series_list.filter((series) => series.imdbId == imdbid);
    } catch (e) {
      if (e instanceof TypeError) {
        return false;
      } else {
        errorNotificationHandler(e, false);
        return false;
      }
    }
    if (!filter.length) {
      return false;
    } else {
      return filter;
    }
  }

  async function autoSync(interval) {
    let currentTimestamp = +new Date();
    let lastSyncTimestamp = await GM.getValue("last_sync_timestamp", 0);
    if (currentTimestamp - lastSyncTimestamp >= interval) {
      let notification =
        "It has been " +
        ((currentTimestamp - lastSyncTimestamp) / 60000).toFixed(1) +
        " minutes since your last sync which exceeds your threshold of " +
        interval / 60000 +
        " minutes. AutoSyncing...";
      console.log(notification);
      GM.notification(notification);
      get_sonarr_series();
    }
  }

  // Credit to mcfloyd @ PTP
  function new_series_lookup(imdbid) {
    return GM_xmlHttpRequest_promise({
      method: "GET",
      url: sonarrUrl.concat("/api/v3/series/lookup/?term=imdb%3A", imdbid),
      headers: headers,
    })
      .then((response) => {
        let responseJSON = null;
        if (!response.responseJSON) {
          if (response.status == 401) {
            GM.notification({
              text: "Error: Invalid Sonarr API Key.",
              title: "UNIT3DToSonarr",
              timeout: 3000,
            });
            throw new Error("Invalid Sonarr API Key");
          } else if (!response.responseText) {
            GM.notification({
              text: "No results found.",
              title: "UNIT3DToSonarr",
              timeout: 3000,
            });
            throw new Error("No results found");
          }
          responseJSON = JSON.parse(response.responseText);
          if (responseJSON.length > 0) {
            add_series(responseJSON[0], imdbid);
            return responseJSON[0];
          } else {
            console.log("series not found");
            throw new Error("Series not found");
          }
        }
      })
      .catch((error) => {
        GM.notification({
          text: "Request Error.\nCheck Sonarr URL!",
          title: "UNIT3DToSonarr",
          timeout: 3000,
        });
        throw error;
      });
  }

  function add_series(series, imdbid) {
    series.monitored = monitored;
    series.qualityProfileId = qualityProfile;
    series.rootFolderPath = rootPath;
    series.addOptions = {
      searchForSeries: searchOnAdd,
    };

    return GM_xmlHttpRequest_promise({
      method: "POST",
      url: sonarrUrl.concat("/api/v3/series"),
      headers: headers,
      data: JSON.stringify(series),
    })
      .then((response) => {
        const responseJSON = JSON.parse(response.responseText);
        let button = document.getElementById("UNIT3DToSonarr-" + imdbid);
        if (response.status == 201) {
          clickswap(imdbid, responseJSON.titleSlug);
          GM.notification({
            text: responseJSON.title + " Successfully sent to Sonarr",
            title: "UNIT3DToSonarr",
            timeout: 4000,
          });
          get_sonarr_series();
          button.style.filter = "drop-shadow(#36c6f4 0px 0px 5px)";
        } else {
          button.style.filter = "drop-shadow(#36c6f4 0px 0px 5px)";
        }
      })
      .catch((error) => {
        GM.notification({
          text: "Request Error.\nCheck Sonarr URL!",
          title: "UNIT3DToSonarr",
          timeout: 3000,
        });
        throw error;
      });
  }

  // Pagination and searching support shouts out GPT
  let timeoutId = null;

  function handlePageUpdate() {
    setTimeout(() => {
      const sonarrButtons = document.querySelectorAll(".sonarr-button");
      if (sonarrButtons.length === 0) {
        set_html();
      }
    }, 100);
  }
  function debouncedHandlePageUpdate() {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(handlePageUpdate, 200);
  }
  const targetNode = document.querySelector(".panelV2.torrent-search__results");
  if (targetNode) {
    const config = { childList: true, subtree: true };
    const callback = function (mutationsList, observer) {
      for (let mutation of mutationsList) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          debouncedHandlePageUpdate();
        }
      }
    };

    const observer = new MutationObserver(callback);

    observer.observe(targetNode, config);
  }
})();
