// Enhancements for admin steps table: sorting and filtering
let allSteps = [];
let currentSortField = 'date';
let currentSortAsc = true;

// Override loadSteps to fetch data and render table
async function loadSteps() {
  const res = await fetch('/admin/steps');
  allSteps = await res.json();
  renderStepsTable();
}

// Set sorting field and toggle asc/desc
function setSort(field) {
  if (currentSortField === field) {
    currentSortAsc = !currentSortAsc;
  } else {
    currentSortField = field;
    currentSortAsc = true;
  }
  renderStepsTable();
}

// Filter function based on inputs
function filterSteps(data) {
  const dateFilter = document.getElementById('filterDate')?.value.toLowerCase() || '';
  const employeeFilter = document.getElementById('filterEmployee')?.value.toLowerCase() || '';
  const locationFilter = document.getElementById('filterLocation')?.value.toLowerCase() || '';
  const stepsFilter = document.getElementById('filterSteps')?.value;
  return data.filter(item => {
    let ok = true;
    if (dateFilter) ok = ok && item.date.includes(dateFilter);
    if (employeeFilter) ok = ok && item.employee_name.toLowerCase().includes(employeeFilter);
    if (locationFilter) ok = ok && item.location_name.toLowerCase().includes(locationFilter);
    if (stepsFilter) ok = ok && item.steps == parseInt(stepsFilter);
    return ok;
  });
}

// Render steps table with sorting and filtering
function renderStepsTable() {
  let data = filterSteps([...allSteps]);
  data.sort((a, b) => {
    let valA = a[currentSortField];
    let valB = b[currentSortField];
    if (currentSortField === 'steps') {
      valA = Number(valA);
      valB = Number(valB);
    } else {
      valA = valA.toString().toLowerCase();
      valB = valB.toString().toLowerCase();
    }
    if (valA < valB) return currentSortAsc ? -1 : 1;
    if (valA > valB) return currentSortAsc ? 1 : -1;
    return 0;
  });
  const tbody = document.querySelector('#stepsTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  data.forEach(entry => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="p-2 whitespace-nowrap">${entry.date}</td>
      <td class="p-2 whitespace-nowrap">${entry.employee_name}</td>
      <td class="p-2 whitespace-nowrap">${entry.location_name}</td>
      <td class="p-2 whitespace-nowrap text-right">${entry.steps}</td>
      <td class="p-2 text-center whitespace-nowrap">
        <button class="text-blue-600 hover:underline" onclick="editStep(${entry.id}, ${entry.steps})">Rediger</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  if (typeof computeSummary === 'function') {
    computeSummary(data);
  }
}

// On DOMContentLoaded, add filter row and event listeners
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const thead = document.querySelector('#stepsTable thead');
    if (thead && !document.getElementById('filterDate')) {
      const filterRow = document.createElement('tr');
      filterRow.innerHTML = `
        <th><input id="filterDate" type="text" class="w-full p-1 border border-gray-300" placeholder="Filter dato"></th>
        <th><input id="filterEmployee" type="text" class="w-full p-1 border border-gray-300" placeholder="Filter ansatt"></th>
        <th><input id="filterLocation" type="text" class="w-full p-1 border border-gray-300" placeholder="Filter lokasjon"></th>
        <th><input id="filterSteps" type="number" class="w-full p-1 border border-gray-300" placeholder="Filter skritt"></th>
        <th></th>
      `;
      thead.appendChild(filterRow);
      ['filterDate','filterEmployee','filterLocation','filterSteps'].forEach(id => {
        document.getElementById(id).addEventListener('input', renderStepsTable);
      });
    }
  });
}
