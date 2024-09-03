// Filter functionality for the "People" page
document.getElementById('peopleSkillSearch').addEventListener('input', function() {
    filterPeople();
});

document.getElementById('peopleLocationRadius').addEventListener('change', function() {
    filterPeople();
});

function filterPeople() {
    const skill = document.getElementById('peopleSkillSearch').value.toLowerCase();
    const radius = parseInt(document.getElementById('peopleLocationRadius').value);
    const people = document.querySelectorAll('#peopleContainer .showcase');

    people.forEach(person => {
        const personSkill = person.getAttribute('data-skill').toLowerCase();
        const personLocation = parseInt(person.getAttribute('data-location'));

        if (personSkill.includes(skill) && personLocation <= radius) {
            person.style.display = 'block';
        } else {
            person.style.display = 'none';
        }
    });
}
