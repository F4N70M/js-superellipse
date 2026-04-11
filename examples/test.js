
const triggers = document.querySelectorAll('.wrapper .label');
console.debug('trigger', triggers);
for (const trigger of triggers) {
	const target = trigger.querySelectorAll(' + .content');
	console.debug('trigger', trigger);
}