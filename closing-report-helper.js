/* =============================
 * Rides Closing Report Helper
 * - by Jordan Myers
 * - version 0.1.6 (6/22/2023)
 * ============================= */

// Create a globally-scoped object to store timeouts for each field
const timeoutStore = {};

// Handle swapping beginning/ending counts when clicking an eligible field
function clickToSwap(rideId) {
  const endNode = document.querySelector(`input[name="${rideId}_endcount"]`); // Get the ending count field for the given rideId
  const beginNode = document.querySelector(`input[name="${rideId}_begcount"]`); // Get the beginning count field for the given rideId

  // Swap the value parameters
  [endNode.value, beginNode.value] = [beginNode.value, endNode.value];

  // Javascript is stupid, so sync with the DOM
  endNode.setAttribute('value', endNode.value);
  beginNode.setAttribute('value', beginNode.value);

  // Fire a change event to update the difference field
  endNode.dispatchEvent(new Event('change'));
}

// Create a listener for click events on a difference field
function createClickToSwapListener(differenceField, rideId) {
  differenceField.addEventListener('click', () => {
    clickToSwap(rideId);
  });
}

// Function to calculate and update the difference for a given form row, corresponding to a ride
// Called on updates to the beginning/ending counts and when injecting the difference fields
function calcDiff(rideId) {
  const targetNode = document.querySelector(`input[name="${rideId}_diff"]`); // Get the difference field for the given rideId
  const endNode = document.querySelector(`input[name="${rideId}_endcount"]`); // Get the ending count field for the given rideId
  const beginNode = document.querySelector(`input[name="${rideId}_begcount"]`); // Get the beginning count field for the given rideId

  // Avoid self-inflicted NaN by setting null values to 0 for our calculation
  const endValue = endNode.value != null ? endNode.value : 0;
  const beginValue = beginNode.value != null ? beginNode.value : 0;

  // I hope you can figure out how subtraction works...
  const newValue = endValue - beginValue;

  // Set color and optionally abort a click listener
  function setColor(color) {
    targetNode.title = color === null ? '' : 'Click to swap beginning / end values';
    targetNode.setAttribute('class', color === null ? null : color);
  }

  // Hilight the difference field with colors to match its value
  switch (true) {
    case Number.isNaN(newValue): // Check for non-number value issues
    case newValue < 0:
      // Red for errors or negative numbers
      setColor('red pointer');
      break;
    case newValue >= 1 && newValue <= 500:
    case newValue >= 10000:
      // Yellow for 1-500 (inclusive) and 10,000+ values
      setColor('yellow pointer');
      break;
    case newValue === 0:
      setColor(null);
      break; // Leave null or 0 fields alone
    default:
      // Green for everything else
      setColor('green pointer');
      break;
  }
  // Update the value displayed, showing an error for non-number values or nothing for 0
  if (Number.isNaN(newValue)) {
    targetNode.value = 'Error!';
  } else {
    targetNode.value = newValue === 0 ? null : newValue;
    targetNode.setAttribute('value', newValue || 0);
  }
}

// Function to inject the necessary header and input fields to display the difference
// Called whenever the form changes
function injectDifferenceFields() {
  const table = document.querySelector('table#mytable'); // Select the table containing the entry form
  if (table) {
    // Get all the header (th) elements, then sort through them to find the beginning count
    const headers = table.querySelectorAll('th');
    const headerRegex = /^Beg[.]? Count$/gi;
    let beginCountHeader = null;
    headers.forEach((header) => {
      const found = header.textContent.match(headerRegex);
      if (found) { beginCountHeader = header; }
    });
    // Create a new "difference" header element and inject it after beginning count
    const differenceHeader = Object.assign(document.createElement('th'), {
      scope: 'col',
      textContent: 'Difference',
    });
    beginCountHeader.insertAdjacentElement('afterend', differenceHeader);

    const textFields = table.querySelectorAll('td > input[type=text]'); // Get all text input fields
    textFields.forEach((field) => {
      const beginEndRegex = /([0-9]+)_(begcount|endcount)/i; // Matches rideId and both beginning count and ending count fields
      const found = field.name.match(beginEndRegex);
      if (found) {
        // If this is a beginning count field, inject a new (disabled) field
        // after it to store the difference. Call calcDiff to calculate the
        // difference in case there's already data present in the form
        if (found[2] === 'begcount') {
          const differenceField = Object.assign(document.createElement('td'), {
            innerHTML: `<input type="text" name="${found[1]}_diff" value="" size="8" disabled>`,
          });

          createClickToSwapListener(differenceField, found[1]);
          field.parentNode.insertAdjacentElement('afterend', differenceField);
          calcDiff(found[1]);
        }

        // Watch the beginning and ending counts for input
        field.addEventListener('input', () => {
          // If timeoutStore already had an input timeout for
          // this ride, clear it and restart the timeout
          if (timeoutStore[found[1]]) { clearTimeout(timeoutStore[found[1]]); }
          // Set a timeout for 1 second, giving the user time to
          // finish their input, then calculate the difference
          timeoutStore[found[1]] = setTimeout(() => { calcDiff(found[1]); }, 1000);
        });

        // Watch the beginning and ending counts for change events (includes focusout)
        field.addEventListener('change', () => {
          calcDiff(found[1]);
        });
      }
    });
  }
}

// To be called on DOM load
function runDifferenceObserver() {
  // Get the entry form
  const dataForm = document.querySelector('#dataForm');
  // Create an observer for the form
  const formObserver = new MutationObserver(injectDifferenceFields);
  // Observe the form for changes to the child nodes (i.e., when the area has been changed)
  formObserver.observe(dataForm, { childList: true });
}

// Run all the relevant things after DOM load
document.body.onload = () => {
  // Run the difference injector/observer
  runDifferenceObserver();

  // Some style changes to the area selector and difference fields
  Object.assign(document.querySelector('select#area'), { multiple: true });
  const selectorStyle = Object.assign(document.createElement('style'), {
    innerHTML: `
      select#area{
        height: 30px;
        border: none;
        overflow: hidden;
      }
      select#area:focus {
        outline: none;
      }
      select#area option {
        padding: 5px;
        margin-right: 5px;
        text-align: center;
        display: inline-block;
        border: solid 1px;
        border-radius: 7px;
      }
      input.red {
        background-color: #fda4af;
      }
      input.yellow {
        background-color: #fef08a;
      }
      input.green {
        background-color: #a7f3d0;
      }
      input.pointer {
        cursor: pointer;
      }
    `,
  });
  document.querySelector('head').appendChild(selectorStyle);
};
