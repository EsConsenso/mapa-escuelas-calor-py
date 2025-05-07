/*
    Copyright (C) 2025 Consenso and Tania Karo Mesa Montórfano

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

*/

// Variables globales
let map, sidebar;
let escuelasLayer = null; // Aca vamos a guardar la capa de escuelas
let estacionesLayer = null; // Aca vamos a guardar la capa de estaciones

let geojsonUrlescuelas = 'https://esconsenso.github.io/mapa-escuelas-calor-py/HOJA2.geojson'; 
let geojsonUrlestaciones = 'estaciones-hakusito.geojson'; // CAMBIAR POR https://esconsenso.github.io/mapa-escuelas-calor-py/estaciones-hakusito.geojson' AL SUBIR AL REPO

// Espera a que cargue el DOM
document.addEventListener("DOMContentLoaded", function () {
    init();
});

// Botones para alternar vista
document.getElementById("btn-estaciones").addEventListener("click", function () {
    clearLayers();
    loadMapaEstaciones();
});

document.getElementById("btn-escuelas").addEventListener("click", function () {
    clearLayers();
    loadMapaEscuelas();
});

// Se llama solo una vez al cargar
function init() {
    makeMap();          // 1. Inicializa el mapa con la imagen satelital
    addTileLayer();     // 2. Agrega OSM
    addSidebar();       // 3. Sidebar
    addGeoJSON(geojsonUrlescuelas, "escuelas");
    addPinSearch();

        // Popup específico para las escuelas
        let popupescuelas = L.popup({
            autoPan: true,
            autoPanPadding: L.point(10, 10)
        })
        .setLatLng(map.getBounds().getSouthEast())
        .setContent('<div id="popUp"><h6>Clickeá en una <br>institución educativa <br>para saber sobre <br>sus necesidades</h6></div>')
        .openOn(map);
    
}

// Función para crear el mapa base (solo si no existe)
function makeMap() {
    let lowerLeft = [-25.70095, -57.83323];
    let upperRight = [-24.8821, -57.14187];
    let center = [-25.295239, -57.625608]; // Centro del mapa

    // Definir los límites del mapa según la imagen satelital
    let bounds = L.latLngBounds(lowerLeft, upperRight);
    let imageBounds = [lowerLeft, upperRight];

    // Inicializamos el mapa
    map = L.map('map', {
        center: center,
        maxZoom: 16,
        zoom: 14.5,
        minZoom: 11.5,
        maxBounds: bounds, // Restringe el área visible
        maxBoundsViscosity: 1.0, // Mantiene al usuario dentro de los límites
        scrollWheelZoom: false // Desactiva el zoom con el scroll del mouse
    });

    // Permitir el zoom con scroll solo cuando el usuario haga clic en el mapa
    map.on('click', function () {
        map.scrollWheelZoom.enable();
    });

    // Opcional: deshabilitar nuevamente el zoom con scroll cuando el usuario haga scroll en la página
    document.addEventListener('scroll', function () {
        map.scrollWheelZoom.disable();
    });

    // Agregamos la imagen satelital
    let imageUrl = 'https://esconsenso.github.io/mapa-escuelas-calor-py/imagenes/mapa-calor-asu.png';
    let imageLayer = L.imageOverlay(imageUrl, imageBounds, { opacity: 0.7 });
    imageLayer.addTo(map);
}

// Función para agregar la capa de OpenStreetMap
function addTileLayer() {
    let tileOSM = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    tileOSM.on('tileload', function (event) {
        event.tile.style.filter = "grayscale(100%)"; // Aplica el filtro a cada imagen
    });
}

// Carga mapa con escuelas
function loadMapaEscuelas() {
    addGeoJSON(geojsonUrlescuelas, "escuelas"); // 4. Carga escuelas

    // Popup específico para las escuelas
    let popupescuelas = L.popup({
        autoPan: true,
        autoPanPadding: L.point(10, 10)
    })
    .setLatLng(map.getBounds().getSouthEast())
    .setContent('<div id="popUp"><h6>Clickeá en una <br>institución educativa <br>para saber sobre <br>sus necesidades</h6></div>')
    .openOn(map);
}

// Carga mapa con estaciones
function loadMapaEstaciones() {
    addGeoJSON(geojsonUrlestaciones, "estaciones"); // 4. Carga estaciones

    // Popup específico para las estaciones
    let popupestaciones = L.popup({
        autoPan: true,
        autoPanPadding: L.point(10, 10)
    })
    .setLatLng(map.getBounds().getSouthEast())
    .setContent('<div id="popUp"><h6>Clickeá en una <br>estación de servicio <br>para conocer sus <br>características y ubicación</h6></div>')
    .openOn(map);
}


// Función para agregar GeoJSON
function addGeoJSON(geojsonUrl, tipo = "escuelas") {
    let targetLayer = (tipo === "escuelas") ? escuelasLayer : estacionesLayer;

    if (targetLayer) {
        map.removeLayer(targetLayer);
    }

    fetch(geojsonUrl)
        .then(response => {
            if (!response.ok) throw new Error(`Error cargando ${tipo}: ${response.status}`);
            return response.json();
        })
        .then(data => {
            let newLayer = L.geoJSON(data, {
                pointToLayer: (feature, latlng) => {
                    let name = feature.properties?.Nombre || feature.properties?.nombre || "Sin nombre";
                    return L.marker(latlng, {
                        icon: createIcon(map.getZoom(), tipo),
                        title: name
                    });
                },
                onEachFeature: (feature, layer) => {
                    layer.on("click", () => configureMarkerInteraction(layer, tipo));
                }
            }).addTo(map);

            if (tipo === "escuelas") {
                escuelasLayer = newLayer;
            } else {
                estacionesLayer = newLayer;
            }

            map.on("zoomend", function () {
                let newZoom = map.getZoom();
                newLayer.eachLayer(layer => {
                    if (layer instanceof L.Marker) {
                        layer.setIcon(createIcon(newZoom, tipo));
                    }
                });
            });
        })
        .catch(error => {
            console.error(`Error cargando datos de ${tipo}:`, error);
            alert(`No se pudieron cargar los datos de ${tipo}.`);
        });
}

let marcadorSeleccionado = null;

// Función para configurar la interacción con los marcadores
function configureMarkerInteraction(layer, tipo) {
    let props = layer.feature.properties;
    let contenido = "";

    if (tipo === "escuelas") {
        let name = props?.Nombre || "Sin nombre";
        let departamento = props?.Departamento || "Desconocido";
        let distrito = props?.Distrito || "Desconocido";
        let riesgoCalor = props?.scale || "Sin datos";
        let colorCalor = props?.color || "Sin datos";

        let recursosArray = [];
        for (let i = 1; i <= 10; i++) {
            let recurso = props[`R${i}`];
            let cantidad = props[`cantidad${i}`];
            let beneficiarios = props[`beneficiarios${i}`];
            
            if (recurso && cantidad && beneficiarios) {
                recursosArray.push(`<li><b>${recurso}</b>. Cantidad: ${cantidad} (Beneficiarios: ${beneficiarios})</li>`);
            }
        }

        contenido = `
            <div>
                <p style="font-family: 'Fira Code', monospace;"><b>Nombre:</b> ${name}</p>
                <p style="font-family: 'Fira Code', monospace;"><b>Ubicación:</b> ${departamento}, ${distrito}</p>
                <p style="font-family: 'Fira Code', monospace; background-color: ${colorCalor};"><b>Riesgo de calor:</b> ${riesgoCalor}</p>
                <p style="font-family: 'Fira Code', monospace;"><b>Recursos Necesarios:</b></p>
                <ul style="font-family: 'Fira Code', monospace;">${recursosArray.length > 0 ? recursosArray.join("") : "<li>No hay recursos registrados</li>"}</ul>
            </div>`;

        document.getElementById("escuelaName").textContent = "Escuela Seleccionada";
        document.getElementById("escuelaContent").innerHTML = contenido;
        sidebar.open("escuelas");

        // Marcar ícono seleccionado
        if (marcadorSeleccionado && marcadorSeleccionado._icon) {
            marcadorSeleccionado._icon.classList.remove("selected");
        }
        if (layer._icon) {
            layer._icon.classList.add("selected");
            marcadorSeleccionado = layer;
        }
    }

    else if (tipo === "estaciones") {
        let distribuidor = props?.distribuidor || "Sin datos";
        let direccion = props?.direccion || "Sin dirección";
        let riesgoCalor = props?.scale || "Sin datos";
        let colorCalor = props?.color || "Sin datos";
        
        contenido = `
            <div>
                <p style="font-family: 'Fira Code', monospace;"><b>Distribuidor:</b> ${distribuidor}</p>
                <p style="font-family: 'Fira Code', monospace;"><b>Dirección:</b> ${direccion}</p>
                <p style="font-family: 'Fira Code', monospace; background-color: ${colorCalor};"><b>Riesgo de calor:</b> ${riesgoCalor}</p>
            </div>`;

        document.getElementById("estacionContent").innerHTML = contenido;
        document.getElementById("estacionName").textContent = "Estación Seleccionada";
        sidebar.open("estaciones");

        // Marcar ícono seleccionado
        if (marcadorSeleccionado && marcadorSeleccionado._icon) {
            marcadorSeleccionado._icon.classList.remove("selected");
        }
        if (layer._icon) {
            layer._icon.classList.add("selected");
            marcadorSeleccionado = layer;
        }
    }

    // Centrar el mapa
    let latlng = layer.getLatLng();
    map.setView([latlng.lat, latlng.lng - 0.001], 18, { animate: true });
}

// Función para crear el ícono personalizado
function createIcon(zoom, tipo) {
    let size = Math.max(10, zoom * 1.5);
    let iconHtml = "";

    if (tipo === "escuelas") {
        iconHtml = `<i class="bi bi-mortarboard" style="font-size: ${size}px; color: #0b3954;"></i>`;
    } else if (tipo === "estaciones") {
        iconHtml = `<i class="bi bi-fuel-pump" style="font-size: ${size}px; color: #0b3954;"></i>`;
    }

    return L.divIcon({
        className: "custom-div-icon",
        html: iconHtml,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2]
    });
}

// Limpia capas anteriores del mapa
function clearLayers() {
    if (escuelasLayer) {
        map.removeLayer(escuelasLayer);
        escuelasLayer = null;
    }
    if (estacionesLayer) {
        map.removeLayer(estacionesLayer);
        estacionesLayer = null;
    }
}

function addSidebar() {
    sidebar = L.control.sidebar({
        autopan: false,
        closeButton: true,
        container: 'sidebar',
        position: 'left'
    }).addTo(map);

    map.on("click", function () {
        let sidebarElement = document.querySelector(".leaflet-sidebar");
        if (!sidebarElement.classList.contains("collapsed")) {
            sidebar.close();
        }
    });

    function closeSidebar(event) {
        let sidebar = document.querySelector(".leaflet-sidebar");
        if (!sidebar.contains(event.target) && sidebar.classList.contains("open")) {
            sidebar.close();
        }
    }

    document.addEventListener("click", closeSidebar);
    document.addEventListener("touchstart", closeSidebar);
}

function addPinSearch() {
    let searchBar = L.control.pinSearch({
        position: 'topright',
        placeholder: 'Buscar escuela',
        buttonText: 'buscar',
        onSearch: function (query) {
            let resultsContainer = document.getElementById("search-results");
            if (!resultsContainer) {
                resultsContainer = document.createElement("div");
                resultsContainer.id = "search-results";
                resultsContainer.style.position = "absolute";
                resultsContainer.style.background = "white";
                resultsContainer.style.border = "1px solid gray";
                resultsContainer.style.padding = "5px";
                resultsContainer.style.maxHeight = "150px";
                resultsContainer.style.overflowY = "auto";
                resultsContainer.style.width = "200px";
                resultsContainer.style.zIndex = "1000";
                document.querySelector(".leaflet-control-pinsearch").appendChild(resultsContainer);
            }

            resultsContainer.innerHTML = "";

            let foundMarkers = [];
            map.eachLayer(layer => {
                if (layer instanceof L.Marker && layer.options.title) {
                    if (layer.options.title.toLowerCase().includes(query.toLowerCase())) {
                        foundMarkers.push(layer);
                    }
                }
            });

            if (foundMarkers.length === 0) {
                resultsContainer.innerHTML = "<div style='padding: 5px;'>No se encontraron resultados</div>";
                return;
            }

            foundMarkers.forEach(marker => {
                let resultItem = document.createElement("div");
                resultItem.innerText = marker.options.title;
                resultItem.style.padding = "5px";
                resultItem.style.cursor = "pointer";
                resultItem.style.borderBottom = "1px solid lightgray";

                resultItem.addEventListener("click", () => {
                    // Centrar el mapa en el marcador seleccionado y hacer zoom
                    let latlng = marker.getLatLng();
                    let offsetLng = -0.0015 / 3; // Ajusta este valor según el nivel de zoom para moverlo 400px
                    map.setView([latlng.lat, latlng.lng + offsetLng], 18, { animate: true });

                    // Abrir el popup del marcador
                    if (marker.getPopup()) {
                        marker.openPopup();
                    } else {
                        console.warn("El marcador no tiene un popup asociado.");
                    }

                    // Actualizar el sidebar con la información del marcador
                    let name = marker.options.title || "Sin nombre";
                    document.getElementById("escuelaName").innerHTML = `Local Educativo Seleccionado`;
                    document.getElementById("escuelaContent").innerHTML = `<div><p>Nombre: <b>${name}</b></p></div>`;

                    // Abrir el sidebar
                    if (sidebar) {
                        sidebar.open('escuelas');
                    } else {
                        console.warn("El sidebar no está inicializado.");
                    }

                    // Ajustar la vista del mapa para que el popup no quede oculto detrás del sidebar
                    map.panBy([200, 0]); // Ajusta este valor según el ancho del sidebar

                    // Resetear la barra de búsqueda
                    let searchInput = document.querySelector(".search-input");
                    if (searchInput) {
                        searchInput.value = ""; // Limpiar el texto de búsqueda
                    }

                    // Limpiar los resultados de búsqueda
                    resultsContainer.innerHTML = "";
                });

                resultsContainer.appendChild(resultItem);
            });
        },
        searchBarWidth: '200px',
        searchBarHeight: '30px',
        maxSearchResults: 10
    }).addTo(map);

    // Resetear la barra de búsqueda al hacer clic fuera de ella
    document.addEventListener("click", function (event) {
        let searchContainer = document.querySelector(".leaflet-control-pinsearch");
        let resultsContainer = document.getElementById("search-results");

        // Si el clic fue fuera del contenedor de búsqueda, resetear
        if (searchContainer && !searchContainer.contains(event.target)) {
            if (resultsContainer) {
                resultsContainer.innerHTML = ""; // Limpiar los resultados
            }
            let searchInput = document.querySelector(".search-input");
            if (searchInput) {
                searchInput.value = ""; // Limpiar el texto de búsqueda
            }
        }
    });

    setTimeout(() => {
        let searchInput = document.querySelector(".search-input");
        if (searchInput) {
            searchInput.id = "search-input";
            searchInput.name = "search-input";
        }
    }, 100);

    window.searchBar = searchBar;

    setTimeout(() => {
        let searchInput = document.querySelector(".search-input");
        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                searchBar.options.onSearch(e.target.value);
            });
        }
    }, 500);
}