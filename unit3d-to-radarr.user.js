// ==UserScript==
// @name         UNIT3D-to-Radarr
// @version      0.2
// @author       dantayy
// @namespace    https://github.com/frenchcutgreenbean/
// @description  Send movies to radarr from UNIT3D trackers
// @icon         https://i.ibb.co/C7f0QDw/svgexport-1-1.png
// @match        *://fearnopeer.com/*
// @match        *://aither.cc/*
// @match        *://blutopia.cc/*
// @match        *://reelflix.xyz/*
// @updateURL    https://github.com/frenchcutgreenbean/unit3d-2-arrs/raw/main/unit3d-to-radarr.user.js
// @downloadURL  https://github.com/frenchcutgreenbean/unit3d-2-arrs/raw/main/unit3d-to-radarr.user.js
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
  const icon = "https://svgshare.com/i/16iY.svg";

  GM_config.init({
    id: "UNIT3DToRadarr",
    title: "UNIT3DToRadarr Settings",
    css: `
        #UNIT3DToRadarr {background: #333333; margin: 0; padding: 20px 20px}
        #UNIT3DToRadarr .field_label {color: #fff; width: 100%;}
        #UNIT3DToRadarr .config_header {color: #fff; padding-bottom: 10px; font-weight: 100;}
        #UNIT3DToRadarr .reset {color: #e8d3d3; text-decoration: none;}
        #UNIT3DToRadarr .config_var {display: flex; flex-direction: row; text-align: left; justify-content: center; align-items: center; width: 85%; margin: 4px auto; padding: 4px 0; border-bottom: 1px solid #7470703d;}
        #UNIT3DToRadarr_buttons_holder { display: grid; gap: 4px; grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(3, 1fr); max-width: 85%; height: 100px; margin: 0 auto; text-align: center; align-items: center;}
        #UNIT3DToRadarr_saveBtn { grid-column: 1; grid-row: 2;}
        #UNIT3DToRadarr_closeBtn { grid-column: 2;  grid-row: 2;}
        #UNIT3DToRadarr_buttons_holder button,#UNIT3DToRadarr_buttons_holder input { cursor: pointer; padding: 2px 5px !important; margin: 0 !important;}
        #UNIT3DToRadarr .reset_holder { grid-column: 1 / 3;  grid-row: 3;}
        #UNIT3DToRadarr .config_var input[type="checkbox"] { cursor: pointer;}
        #UNIT3DToRadarr_field_radarr_syncbutton { grid-column: 1; grid-row: 1;}
        #UNIT3DToRadarr_field_radarr_fetchbutton { grid-column: 2; grid-row: 1;}
            `,
    fields: {
      radarr_url: {
        label: "Radarr URL",
        type: "text",
        default: "https://domain.tld/radarr",
      },
      radarr_apikey: {
        label: "Radarr API Key",
        type: "text",
        default: "",
      },
      enableAuth: {
        label: "Enable Radarr Auth",
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
      radarr_monitored: {
        label: "Add monitored",
        type: "checkbox",
        default: true,
      },
      radarr_profileid: {
        label: "Radarr Quality Profile ID",
        type: "text",
        default: "1",
      },
      radarr_rootfolderpath: {
        label: "Radarr Root Folder Path",
        type: "text",
        default: "/mnt/tv",
      },
      radarr_minimumavailability: {
        label: "Minimum Availability",
        type: "select",
        options: ["announced", "inCinemas", "released"],
        default: "released",
      },
      radarr_searchformovies: {
        label: "Search for movies on request",
        type: "checkbox",
        default: false,
      },
      radarr_sync_interval: {
        label: "AutoSync Interval (Minutes)",
        type: "select",
        options: ["15", "30", "60", "120", "360", "1440", "Never"],
        default: "Never",
      },
      radarr_syncbutton: {
        label: "Sync Radarr Movies",
        type: "button",
        click: get_radarr_movies,
      },
      radarr_fetchbutton: {
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
          .getElementById("UNIT3DToRadarr_buttons_holder")
          .prepend(
            doc.getElementById("UNIT3DToRadarr_radarr_syncbutton_var"),
            doc.getElementById("UNIT3DToRadarr_radarr_fetchbutton_var")
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

  GM.registerMenuCommand("UNIT3DToRadarr Settings", () => GM_config.open());

  let radarr_apikey,
    enableAuth,
    username,
    password,
    monitored,
    radarrUrl,
    qualityProfile,
    rootPath,
    searchOnAdd,
    headers;

  // Function to set global MainVars
  function getMainVars() {
    // Constant variables based on GM_config settings used across functions.
    radarr_apikey = GM_config.get("radarr_apikey");
    enableAuth = GM_config.get("enableAuth");
    username = GM_config.get("username");
    password = GM_config.get("password");
    monitored = GM_config.get("radarr_monitored");
    radarrUrl = GM_config.get("radarr_url").replace(/\/$/, "");
    qualityProfile = GM_config.get("radarr_profileid");
    rootPath = GM_config.get("radarr_rootfolderpath");
    searchOnAdd = GM_config.get("radarr_searchformovies");
    headers = {
      "X-Api-Key": radarr_apikey,
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

  // So it is still "multi" on similar page.
  if (document.querySelector("section.meta") && !isSimilar && !isRequest) {
    current_page_type = "singletorrent";
  } else if (document.querySelector("section.meta") && isRequest) {
    current_page_type = "request";
  } else if (isSimilar || window.location.href.includes("torrent")) {
    current_page_type = "multi";
  }
  if (current_page_type) {
    set_html(false);
  }
  let interval = GM_config.get("radarr_sync_interval");
  if (interval != "Never") {
    let millisecondInterval = Number(interval) * 60000;
    window.setTimeout(() => autoSync(millisecondInterval));
    window.setInterval(
      () => autoSync(millisecondInterval),
      millisecondInterval
    );
  }

  function clickswap(imdbid, titleSlug) {
    let button = document.getElementById("UNIT3DToRadarr-" + imdbid);
    button.firstChild.src =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAAAAAAAAQCEeRdzAAAE/klEQVR4nJVVa0wbVBTun+k//rn4QzNFs1EeLbS0vB9jUF7jsUjcIyCvBdh4Bn9IpVBgHS/RZbrgNrM4FiA8BCZUXgERnTEm+zMmEoKWuPEqG5QCbXl/nnsDyGtsnuS0t733fufcc75zjkBwiDiQKJVKVWtra/fQ0NCTmZmZtdnZ2fXh4eExrVbbq1KpCpxIDsM4UGxIqqur6wlsdWVlBRaLBfPz86DfXNma/cf25ubm1hsaGu4zZ14J3MvLN16v189tXt4GfZEaDAYsLy/T9+xiSEjYpUPB33D0UvoEXkBNbRMsZjO//DIDTC0WMzo7exEQHoejEt/CA8HFImmC8+kE2MYqIfMIR9W9eiwtWWA0Gl8IbKQXLi8vQavtgodfFGw+UkIaShhC8e6X2NraCp88fbpQVFgBe79zEJIRF/fTuPZ5JcbGJriHTM1mE1f2OvZ7akqPb25VwcPnDGzojv3Js8jMzMXfulGTWCz+Lye1tbUta2trPObq/DI4+J3Fu8pbsFfEICIsGoVXr6GawtbyfQfX2roWFJd9hagzsbAjj98uqILINwppaTmY0uuxsb6O+vr6Ng4uEonEFOs1Fm8WDmYkO12Jd5KuwKphEOKwREhlgZCQyiT+kEn9+VrirIBDRBKsvhuCdYIaSQmZHHyBGMawGLuIwRIB8VzNGLMV18XFBTz+40/4eYXh/YzP8F7O1/CWB0AeFA1hchHpFb72litwgvaPX7rKzz4aGITJtLiNwzDz8/M1AiqiHsbpnclbWFhAakYuZOSpp1sw7ONVeL3nGQSPwPW13uewS8yDl2sQnVEgLSuPO7YTw0x56ujo+FkwODj4z84i2qLdF9dvUxgCydsYDigYIPCHmzrAjMxAFhzDz5RVVPI7uxhG4dbpdM8EVP7rB/H6zt06ODv5wYZCwD1/uEfJiM3lYkjpzJc37uwzsFWEAvrY2GeAnvct1QE3QCC7vN9pILUEUseXGBgZGZncW0zscOXNKs4UWUgsjvQZdhuhFx35aQ6y0FgeopLyG/sMMDaOjo4+F7S3t/ezhOxOkAm5+eWcnowttkmFHJAbeUzg/UbOKLbnLA9CaqaKE2Nvkru6uh4I1Gq1ZidNjcY5jE9MIjI8GqLIFAgpB14uVAOhcTiRXk7ULOdrT7cQHCu4B8fIZCj8P8DIX7pdHZdhFhUVlQokEomUnrOx1dhYb7l98y7sguN4EdmkaODqEgyZnFRyiivz2sU1GMfTymDVOARbOltWep33LoazWbQbMhJezY2NjT+wlsviqNV2w8M7Em8V1cA6WQM35wBERF1E0uVPkJmtRubHBUhJ+xRR51LgIQ+EdWIBjuXdgYtHGGpqmjgGw2pubu7c7kVsWFA/N3d2/rjZFXMgon4UfT4J3T39mJycwjwRgcV5kZSFYnp6Gr88+J23CNHJD3mDlHtGoK7+PiXYYNk36WhYpASEx/OWyzpqepoSE5OT3CPGCHJgD0sMnAxUR1DlFsPu1HkIyTHfoAtQKEIyDpwJR5181NLQeGRlqaDXT5PH8/u4vW8m0MsMZEytLoM0/CLedPYrPXSqCWlY6HSji+vUcl9lorEzq6urrJMuyWTu2YeCb4mjo6OoqampjcWa0Y1xeud8ZqAmk4nvsby0tbV1yeWbjPk/IifRaDSlPT09v46NjRm3KDg+Pj7f19f3W0lJSYWbm5v7YRj/An8cf5ZA2dAQAAAAAElFTkSuQmCC";
    button.removeEventListener("click", new_movies_lookup, false);
    button.addEventListener(
      "click",
      function () {
        GM.openInTab(radarrUrl.concat("/movie/", titleSlug), "active");
      },
      false
    );
  }

  function set_html(update) {
    // Select all the movies: category "1"
    let listViewMovies = document.querySelectorAll(
      'tr[data-imdb-id][data-category-id="1"]'
    );
    oldSelection = listViewMovies;
    if (update) {
      let buttons = document.querySelectorAll('[id^="UNIT3DToRadarr-tt"]');
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
        '[href*="/torrents?categories%5B0%5D="]'
      );
      let category = catSelector.href.match(/=(\d+)/)[1];
      if (category === "1") {
        let a = document.querySelector('[href*="://www.imdb.com/title/tt"]');
        let id = a.href.match(/tt\d+/)[0];
        let movies = document.querySelector(".meta__ids");
        if (id) {
          buttonBuilder(movies, id, "single");
        }
      }
    } else if (current_page_type === "request") {
      let a = document.querySelector('[href*="://www.themoviedb.org/"]');
      let id = a.href.match(/\.org\/(.*)\//)[1];
      if (id == "movie") {
        let movies = document.querySelector(".meta__ids");
        buttonBuilder(movies, id, "single");
      }
    } else if (current_page_type == "multi") {
      listViewMovies.forEach((movies) => {
        window.setTimeout(() => {
          let id = movies.getAttribute("data-imdb-id");
          if (id) {
            buttonBuilder(movies, id, "list");
          }
        });
      });
    }
  }

  setInterval(function () {
    if (oldSelection) {
      let newSelection = document.querySelectorAll(
        'tr[data-imdb-id][data-category-id="1"]'
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

  async function buttonBuilder(movies, id, type) {
    let imdbid = id.includes("tt") ? id : "tt" + padImdbId(id);
    let exists = await check_exists(imdbid);
    let button = document.createElement("img");
    button.id = "UNIT3DToRadarr-" + imdbid;
    button.className = "radarr-button";
    button.type = type;
    button.src = icon;

    let listStyler = `
    img.radarr-button {
        padding: 14px;
        margin: 0;
        all: unset;
        width: 13px;
        height: 13px;
        cursor: pointer;
        opacity: 1;
        transition: all .1s;
    }
    img.radarr-button:hover {
        filter: brightness(0.4) !important;
    }
    `;
    const singleStyler = ` 
    img.radarr-button {
        width: 23px;
        position: relative;
        top: 2px;
    }
    `;

    if (type == "single") {
      let meta__radarr = document.createElement("li");
      meta__radarr.className = "meta__radarr";
      let meta_id_tag = document.createElement("a");
      meta_id_tag.className = "meta-id-tag";
      meta_id_tag.href = "#";
      meta_id_tag.append(button);
      meta__radarr.append(meta_id_tag);
      movies.append(meta__radarr);

      GM_addStyle(singleStyler);
    } else if (type == "list") {
      let buttonDiv = movies.querySelector(".torrent-search--list__buttons");
      buttonDiv.append(button);

      GM_addStyle(listStyler);
    }
    if (exists) {
      button.style.filter = "drop-shadow(#F4D136 0px 0px 5px)";
      button.addEventListener(
        "click",
        function () {
          GM.openInTab(
            radarrUrl.concat("/movie/", exists[0].titleSlug),
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

        new_movies_lookup(imdbid)
          .then(() => {
            button.style.filter = "drop-shadow(#F4D136 0px 0px 5px)";
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
    let prestring = "UNIT3DToRadarr::";
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
    if (!radarrUrl || !radarr_apikey) {
      GM.notification({
        title: "UNIT3DtoRadarr",
        text: "Please Check API Key & URL In Settings.",
        timeout: 4000,
      });
      return;
    }

    return GM_xmlHttpRequest_promise({
      method: "GET",
      url: `${radarrUrl}/api/v3/qualityprofile?apikey=${radarr_apikey}`,
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
              title: "UNIT3DtoRadarr",
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
          text: "Request Error.\nCheck Radarr URL!",
          title: "UNIT3DToRadarr",
          timeout: 3000,
        });
        throw error;
      });
  }

  function createModal(obj) {
    const modalStyler = `
            .radarr-modal {
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
            .radarr-modal-content {
                background-color: #1C1C1C;
                color: #CCCCCC;
                margin: 15% auto;
                padding: 20px;
                width: 80%;
                max-width: 300px;
                position: relative;
            }
            .radarr-close {
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
            .radarr-close:hover {
                opacity: 0.8;
            }
        `;
    let modal = document.createElement("div");
    modal.className = "radarr-modal";

    let modalContent = document.createElement("div");
    modalContent.className = "radarr-modal-content";

    let closeButton = document.createElement("button");
    closeButton.className = "radarr-close";
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

  function get_radarr_movies() {
    return GM_xmlHttpRequest_promise({
      method: "GET",
      url: radarrUrl.concat("/api/v3/movie"),
      headers: headers,
    })
      .then((response) => {
        const responseJSON = JSON.parse(response.responseText);
        if (response.status == 200) {
          GM.setValue("existing_movies", JSON.stringify(responseJSON));
          let timestamp = +new Date();
          GM.setValue("last_sync_timestamp", timestamp);
          console.log(
            "UNIT3DToRadarr::Sync: Setting last sync timestamp to " + timestamp
          );
          GM.notification({
            text: "Radarr Sync Complete!",
            title: "UNIT3DToRadarr",
            timeout: 4000,
          });
          set_html(true);
        } else if (response.status == 401) {
          GM.notification({
            text: "Error: Invalid API Key!",
            title: "UNIT3DToRadarr",
            timeout: 4000,
          });
        } else {
          GM.notification({
            text: `Error: ${response.status}`,
            title: "UNIT3DToRadarr",
            timeout: 4000,
          });
        }
      })
      .catch((error) => {
        GM.notification({
          text: "Request Error.\nCheck Radarr URL!",
          title: "UNIT3DToRadarr",
          timeout: 3000,
        });
        throw error;
      });
  }

  async function check_exists(imdbid) {
    let moviesliststr = await GM.getValue("existing_movies", "{}");
    let movies_list = JSON.parse(moviesliststr);
    let filter = null;
    try {
      filter = movies_list.filter((movies) => movies.imdbId == imdbid);
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
      get_radarr_movies();
    }
  }

  // Credit to mcfloyd @ PTP
  function new_movies_lookup(imdbid) {
    return GM_xmlHttpRequest_promise({
      method: "GET",
      url: radarrUrl.concat("/api/v3/movie/lookup/?term=imdb%3A", imdbid),
      headers: headers,
    })
      .then((response) => {
        let responseJSON = null;
        if (!response.responseJSON) {
          if (response.status == 401) {
            GM.notification({
              text: "Error: Invalid Radarr API Key.",
              title: "UNIT3DToRadarr",
              timeout: 3000,
            });
            throw new Error("Invalid Radarr API Key");
          } else if (!response.responseText) {
            GM.notification({
              text: "No results found.",
              title: "UNIT3DToRadarr",
              timeout: 3000,
            });
            throw new Error("No results found");
          }
          responseJSON = JSON.parse(response.responseText);
          if (responseJSON.length > 0) {
            add_movie(responseJSON[0], imdbid);
            return responseJSON[0];
          } else {
            console.log("movies not found");
            throw new Error("Movies not found");
          }
        }
      })
      .catch((error) => {
        GM.notification({
          text: "Request Error.\nCheck Radarr URL!",
          title: "UNIT3DToRadarr",
          timeout: 3000,
        });
        throw error;
      });
  }

  function add_movie(movies, imdbid) {
    movies.monitored = monitored;
    movies.qualityProfileId = qualityProfile;
    movies.rootFolderPath = rootPath;
    movies.addOptions = {
      searchForMovies: searchOnAdd,
    };

    return GM_xmlHttpRequest_promise({
      method: "POST",
      url: radarrUrl.concat("/api/v3/movie"),
      headers: headers,
      data: JSON.stringify(movies),
    })
      .then((response) => {
        const responseJSON = JSON.parse(response.responseText);
        let button = document.getElementById("UNIT3DToRadarr-" + imdbid);
        if (response.status == 201) {
          clickswap(imdbid, responseJSON.titleSlug);
          GM.notification({
            text: responseJSON.title + " Successfully sent to Radarr",
            title: "UNIT3DToRadarr",
            timeout: 4000,
          });
          get_radarr_movies();
          button.style.filter = "drop-shadow(#F4D136 0px 0px 5px)";
        } else {
          button.style.filter = "drop-shadow(#F4D136 0px 0px 5px)";
        }
      })
      .catch((error) => {
        GM.notification({
          text: "Request Error.\nCheck Radarr URL!",
          title: "UNIT3DToRadarr",
          timeout: 3000,
        });
        throw error;
      });
  }

  // Pagination and searching support shouts out GPT
  let timeoutId = null;

  function handlePageUpdate() {
    setTimeout(() => {
      const radarrButtons = document.querySelectorAll(".radarr-button");
      if (radarrButtons.length === 0) {
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
