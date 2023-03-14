function formatDate(arr) {
    for (i = 0; i < arr.length; i++) {

        const timestamp = Number(arr[i].createdAt); // Unix timestamp in seconds
        const date = new Date(timestamp); // Convert to milliseconds

        const now = new Date();
        const diff = now.getTime() - date.getTime();

        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(diff / (1000 * 60 * 60 * 24 * 7));

        let timeString = '';
        
        if (weeks == 1) {
            timeString = `${weeks} week ago`
        }
        else if (weeks > 1) {
            timeString = `${weeks} weeks ago`
        }
        else if (days > 1) {
            timeString = `${days} days ago`;
        }
        else if (days == 1) {
            timeString = `${days} day ago`;
        }
        else if (hours > 1) {
            timeString = `${hours} hours ago`;
        }
        else if (hours == 1) {
            timeString = `${hours} hour ago`;
        }
        else if (minutes == 1) {
            timeString = `${minutes} minute ago`;
        }
        else if (minutes > 1) {
            timeString = `${minutes} minutes ago`;
        }
        else {
            timeString = 'just now';
        }
        arr[i].createdAt = timeString
    }

    return arr
}

module.exports = { formatDate }