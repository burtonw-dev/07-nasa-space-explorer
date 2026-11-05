// Find our date picker inputs on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);

const gallery = document.getElementById('gallery');
const getImagesButton = document.querySelector('button');
const imageModal = document.getElementById('imageModal');
const closeImageModalButton = document.getElementById('closeImageModal');
const modalImage = document.getElementById('modalImage');
const modalImageUnavailable = document.getElementById('modalImageUnavailable');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalExplanation = document.getElementById('modalExplanation');

getImagesButton.addEventListener('click', getSpaceImages);
closeImageModalButton.addEventListener('click', () => imageModal.close());
imageModal.addEventListener('click', (event) => {
	if (event.target === imageModal) {
		imageModal.close();
	}
});

function openImageModal(spaceImage) {
	modalImage.hidden = !spaceImage.hdurl;
	modalImageUnavailable.hidden = Boolean(spaceImage.hdurl);

	if (spaceImage.hdurl) {
		modalImage.src = spaceImage.hdurl;
		modalImage.alt = spaceImage.title;
	} else {
		modalImage.removeAttribute('src');
	}

	modalTitle.textContent = spaceImage.title;
	modalDate.textContent = spaceImage.date;

	const explanationDocument = new DOMParser().parseFromString(spaceImage.explanation || '', 'text/html');
	modalExplanation.textContent = explanationDocument.body.textContent.trim().replace(/^Explanation:\s*/i, '');
	imageModal.showModal();
}

function formatDateForApi(date) {
	const [year, month, day] = date.split('-');
	return `${year.slice(2)}${month}${day}`;
}

async function getSpaceImages() {
	const startDate = startInput.value;
	const endDate = endInput.value;

	if (!startDate || !endDate || startDate > endDate) {
		gallery.innerHTML = '<div class="placeholder"><p>Please choose a valid date range.</p></div>';
		return;
	}

	gallery.innerHTML = '<div class="placeholder"><p>Journey to space... 🚀</p></div>';
	getImagesButton.disabled = true;

	const query = new URLSearchParams({
		date_from: formatDateForApi(startDate),
		date_to: formatDateForApi(endDate),
		per_page: '25'
	});

	try {
		const spaceImages = [];
		let page = 1;
		let pageItems = [];

		while (true) {
			query.set('page', page);
			const apiUrl = `https://science.nasa.gov/wp-json/wp/v2/apod-basic?${query}`;
			const response = await fetch(apiUrl);

			if (!response.ok) {
				throw new Error(`NASA API returned an error (${response.status}).`);
			}

			pageItems = await response.json();
			spaceImages.push(...pageItems);

			const totalPages = Number(response.headers.get('X-WP-TotalPages'));
			if (totalPages > 0 ? page >= totalPages : pageItems.length < 25) {
				break;
			}

			page += 1;
		}

		displaySpaceImages(spaceImages);
	} catch (error) {
		gallery.innerHTML = '<div class="placeholder"><p>Could not load space images. Please try again.</p></div>';
		console.error(error);
	} finally {
		getImagesButton.disabled = false;
	}
}

function displaySpaceImages(spaceImages) {
	gallery.innerHTML = '';
	spaceImages.sort((firstImage, secondImage) => firstImage.date.localeCompare(secondImage.date));

	if (spaceImages.length === 0) {
		gallery.innerHTML = '<div class="placeholder"><p>No APOD entries found for these dates.</p></div>';
		return;
	}

	spaceImages.forEach((spaceImage) => {
		const galleryItem = document.createElement('article');
		galleryItem.className = 'gallery-item';
		galleryItem.tabIndex = 0;
		galleryItem.setAttribute('role', 'button');
		galleryItem.setAttribute('aria-label', `${spaceImage.title}, ${spaceImage.date}`);
		galleryItem.addEventListener('click', () => openImageModal(spaceImage));
		galleryItem.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				openImageModal(spaceImage);
			}
		});

		if (spaceImage.hdurl) {
			const image = document.createElement('img');
			image.src = spaceImage.hdurl;
			image.alt = spaceImage.title;
			image.loading = 'lazy';
			galleryItem.append(image);
		} else {
			const imageMessage = document.createElement('p');
			imageMessage.textContent = 'Image unavailable';
			galleryItem.append(imageMessage);
		}

		const title = document.createElement('h2');
		title.textContent = spaceImage.title;

		const date = document.createElement('p');
		date.textContent = spaceImage.date;

		galleryItem.append(title, date);
		gallery.append(galleryItem);
	});
}
