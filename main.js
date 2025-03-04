// Variables globales
let map, sidebar, markersLayer;

document.addEventListener("DOMContentLoaded", function () {
    init(); // Llama a las funciones que deben ejecutarse al cargar la página
});

function init() {
    makeMap();          // Inicializa el mapa y agrega la imagen satelital
    addTileLayer();     // Agrega la capa de OpenStreetMap
    addSidebar();       // Agrega el panel lateral
    addGeoJSON();       // Agrega la capa de escuelas
    addPinSearch();     // Agrega la barra de búsqueda
}

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
    

    // PopUp con las instrucciones
    L.popup({
        autoPan: true,
        autoPanPadding: L.point(10, 10)  // 10px de margen en todos los lados
    })
    .setLatLng(map.getBounds().getSouthEast())
    .setContent('<div id="popUp"><h4>Clickeá en una institución educativa para saber más sobre sus necesidades</h4></div>')
    .openOn(map);

    // Agregamos la imagen satelital
    let imageUrl = 'https://esconsenso.github.io/mapa-escuelas-calor-py/imagenes/mapa-calor-asu.png';
    let imageLayer = L.imageOverlay(imageUrl, imageBounds, { opacity: 0.7 });
    imageLayer.addTo(map);
}

function addTileLayer() {
    let tileOSM = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    tileOSM.on('tileload', function (event) {
        event.tile.style.filter = "grayscale(100%)"; // Aplica el filtro a cada imagen
    });
}

/*
function configureMarkerInteraction(layer) {
    let name = layer.feature.properties?.Nombre || "Sin nombre";

    layer.bindPopup(name);

    layer.on('click', function () {
        document.getElementById("escuelaName").innerHTML = `Local Educativo Seleccionado`;
        document.getElementById("escuelaContent").innerHTML = `<div><p>Nombre: <b>${name}</b></p></div>`;
        sidebar.open('escuelas');

        let latlng = layer.getLatLng();
        let offsetLng = -0.0015 / 3; // Ajusta este valor según el nivel de zoom para moverlo 400px

        map.setView([latlng.lat, latlng.lng + offsetLng], 18, { animate: true });
    });
}
*/

function configureMarkerInteraction(layer) {
    let props = layer.feature.properties;
    let name = props?.Nombre || "Sin nombre";
    let departamento = props?.Departamento || "Desconocido";
    let distrito = props?.Distrito || "Desconocido";

    // Construcción eficiente de la lista de recursos
    let recursosArray = [];
    for (let i = 1; i <= 10; i++) {
        let recurso = props[`R${i}`];
        let cantidad = props[`cantidad${i}`];
        let beneficiarios = props[`beneficiarios${i}`];

        if (recurso && cantidad && beneficiarios) {
            recursosArray.push(`<li><b>${recurso}</b>: ${cantidad} unidades (Beneficiarios: ${beneficiarios})</li>`);
        }
    }

    let contenido = `
        <div>
            <p><b>Nombre:</b> ${name}</p>
            <p><b>Ubicación:</b> ${departamento}, ${distrito}</p>
            <p><b>Recursos Necesarios:</b></p>
            <ul>${recursosArray.length > 0 ? recursosArray.join("") : "<li>No hay recursos registrados</li>"}</ul>
        </div>`;

    // Solo actualizar el DOM si el contenido cambió
    let sidebarContent = document.getElementById("escuelaContent");
    if (sidebarContent.innerHTML !== contenido) {
        document.getElementById("escuelaName").textContent = `Escuela Seleccionada`;
        sidebarContent.innerHTML = contenido;
    }

    sidebar.open('escuelas');

    let latlng = layer.getLatLng();
    let offsetLng = -0.0015 / 3;
    map.setView([latlng.lat, latlng.lng + offsetLng], 18, { animate: true });
}


function addGeoJSON() {
    let geojsonUrl = 'https://raw.githubusercontent.com/EsConsenso/mapa-escuelas-calor-py/refs/heads/main/HOJA2.geojson'; //! Cambiar por la URL del archivo GeoJSON

    if (markersLayer) {
        map.removeLayer(markersLayer);
    }
    fetch(geojsonUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error fetching GeoJSON: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            markersLayer = L.geoJSON(data, {
                pointToLayer: (feature, latlng) => {
                    let name = feature.properties?.Nombre || "Sin nombre";
                    return L.marker(latlng, { icon: createIcon(map.getZoom()), title: name });
                },
                onEachFeature: (feature, layer) => {
                    layer.on("click", function () {
                        configureMarkerInteraction(layer);
                    });
                }
            }).addTo(map);

            map.on('zoomend', function () {
                let newZoom = map.getZoom();
                markersLayer.eachLayer(layer => {
                    if (layer instanceof L.Marker) {
                        layer.setIcon(createIcon(newZoom));
                    }
                });
            });
        })
        .catch(error => {
            console.error('Error cargando GeoJSON:', error);
            alert("No se pudieron cargar los datos de las escuelas. Por favor, inténtalo de nuevo más tarde.");
        });
}

function createIcon(zoom) {
    let size = Math.max(10, zoom * 1.5); // Ajusta el tamaño dinámicamente, mínimo 10px
    return L.divIcon({
        className: "custom-div-icon",
        html: `<i class="bi bi-mortarboard" style="font-size: ${size}px; color: #0b3954;"></i>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [size / 2, -size / 2]
    });
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