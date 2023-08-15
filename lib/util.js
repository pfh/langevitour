/**** Utility functions ****/
export function has(object, name) {
    return object.hasOwnProperty(name);
}
export function elementVisible(el) {
    // Check several ways of hiding an element or its parents.
    // Hopefully this will work for slideshows.
    let parent = el;
    while (true) {
        let style = window.getComputedStyle(parent);
        if (style.opacity === "0" || style.display === "none" || style.visibility !== "visible")
            return false;
        if (!parent.parentElement)
            break;
        parent = parent.parentElement;
    }
    //https://stackoverflow.com/a/22480938    
    let rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom >= 0 &&
        rect.left < window.innerWidth && rect.right >= 0;
}
export function locateEventInElement(event, el) {
    let rect = el.getBoundingClientRect();
    return [
        (event.x - rect.left) / rect.width * el.offsetWidth,
        (event.y - rect.top) / rect.height * el.offsetHeight
    ];
}
export function toggleVisible(el) {
    if (el.style.display == "none")
        el.style.display = "block";
    else
        el.style.display = "none";
}
export function hexByte(value) {
    value = Math.max(0, Math.min(255, Math.round(value)));
    return (value < 16 ? '0' : '') + value.toString(16);
}
//# sourceMappingURL=util.js.map