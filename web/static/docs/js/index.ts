// This function highlights the current url hash

const highlightID = () => {
	const id = location.hash
	if (id == '') return

	const el = document.querySelector(id)
	if (el == null) return

	// Highlight the element

	el.classList.add('highlighted')

	// Add event listener that unhighlights the element when clicked away

	const eventListener = () => {
		el.classList.remove('highlighted')
		removeEventListener('click', eventListener)
	}

	addEventListener('click', eventListener)
}

// Give all elements with an id an onclick handler

const elementsWithID = document.querySelectorAll<HTMLElement>('[id]')

for (let i = 0; i < elementsWithID.length; i++) {
	elementsWithID[i].onclick = () => {
		// First reset the hash so that we can click the same id multiple times

		location.hash = ''

		// Then set it

		location.hash = '#' + elementsWithID[i].id
	}
}

// Highlight the id of the url hash and add an event listener for it

highlightID()
addEventListener('hashchange', highlightID)