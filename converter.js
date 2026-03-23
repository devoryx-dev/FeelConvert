class ImageConverter {
    constructor() {
        this.SUPPORTED_INPUTS = ['image/jpeg','image/png','image/webp','image/gif','image/bmp','image/tiff','image/svg+xml','image/x-icon','image/vnd.microsoft.icon'];
        this.FORMAT_MIME = {png:'image/png',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',bmp:'image/bmp',ico:'image/x-icon'};
        this.FORMAT_EXT = {png:'.png',jpeg:'.jpg',webp:'.webp',gif:'.gif',bmp:'.bmp',ico:'.ico'};
        this.namingMode = 'suffix';
    }

    validateFile(file) {
        const type = file.type || this.guessType(file.name);
        if (!this.SUPPORTED_INPUTS.some(t => type.includes(t.split('/')[1])) && !this.isSupported(file.name)) {
            return { valid: false, error: `Unsupported format: .${file.name.split('.').pop().toUpperCase()}` };
        }
        return { valid: true };
    }

    isSupported(name) {
        return ['jpg','jpeg','png','webp','gif','bmp','tiff','tif','svg','ico'].includes(name.toLowerCase().split('.').pop());
    }

    guessType(name) {
        const map = {jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',bmp:'image/bmp',tiff:'image/tiff',tif:'image/tiff',svg:'image/svg+xml',ico:'image/x-icon'};
        return map[name.toLowerCase().split('.').pop()] || '';
    }

    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(2) + ' MB';
    }

    loadImage(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => resolve({ img, url, width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
            img.src = url;
        });
    }

    yieldToMain() {
        return new Promise(r => typeof requestIdleCallback === 'function' ? requestIdleCallback(r, { timeout: 50 }) : setTimeout(r, 0));
    }

    async convert(file, options = {}) {
        const { format = 'png', quality = 0.92, width = null, height = null, maintainAspect = true, preserveTransparency = true } = options;
        const { img, url } = await this.loadImage(file);
        await this.yieldToMain();
        let tW = width || img.naturalWidth, tH = height || img.naturalHeight;
        if (maintainAspect && (width || height)) {
            const r = img.naturalWidth / img.naturalHeight;
            if (width && !height) tH = Math.round(width / r);
            else if (height && !width) tW = Math.round(height * r);
            else { const s = Math.min(width / img.naturalWidth, height / img.naturalHeight); tW = Math.round(img.naturalWidth * s); tH = Math.round(img.naturalHeight * s); }
        }
        if (format === 'ico') { const s = Math.min(256 / img.naturalWidth, 256 / img.naturalHeight, 1); tW = Math.round(img.naturalWidth * s); tH = Math.round(img.naturalHeight * s); }
        const canvas = document.createElement('canvas'); canvas.width = tW; canvas.height = tH;
        const ctx = canvas.getContext('2d');
        if (!['png','webp','gif','ico'].includes(format) || !preserveTransparency) { ctx.fillStyle = '#FFF'; ctx.fillRect(0, 0, tW, tH); }
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, tW, tH);
        URL.revokeObjectURL(url);
        await this.yieldToMain();
        if (format === 'ico') return this.canvasToIco(canvas);
        const mime = this.FORMAT_MIME[format] || 'image/png';
        const qp = ['jpeg','webp'].includes(format) ? quality : undefined;
        return new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('Conversion failed')), mime, qp));
    }

    async smartCompress(file, format = 'webp') {
        const { img, url } = await this.loadImage(file);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        const mime = this.FORMAT_MIME[format] || 'image/webp';
        if (!['jpeg','webp'].includes(format)) {
            return new Promise((res, rej) => canvas.toBlob(b => b ? res({ blob: b, quality: 100 }) : rej(new Error('Failed')), mime));
        }
        let lo = 30, hi = 95, bestBlob = null, bestQ = 92;
        while (lo <= hi) {
            const mid = Math.floor((lo + hi) / 2);
            const blob = await new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('Failed')), mime, mid / 100));
            bestBlob = blob; bestQ = mid;
            if (blob.size < file.size * 0.6) lo = mid + 1;
            else hi = mid - 1;
            await this.yieldToMain();
        }
        return { blob: bestBlob, quality: bestQ };
    }

    recommendFormat(file) {
        const ext = file.name.toLowerCase().split('.').pop();
        const type = file.type || this.guessType(file.name);
        const sizeKB = file.size / 1024;
        const hasAlpha = ['png','webp','gif','svg','ico'].includes(ext);

        if (ext === 'bmp' || ext === 'tiff' || ext === 'tif') return { format: 'webp', reason: `WEBP is much smaller than ${ext.toUpperCase()} with similar quality` };
        if (ext === 'png' && sizeKB > 500 && !hasAlpha) return { format: 'webp', reason: 'WEBP can reduce this PNG by 30-50% with no quality loss' };
        if (ext === 'png' && sizeKB > 500 && hasAlpha) return { format: 'webp', reason: 'WEBP supports transparency and is smaller than PNG' };
        if ((ext === 'jpg' || ext === 'jpeg') && sizeKB > 1000) return { format: 'webp', reason: 'WEBP typically 25-35% smaller than JPEG at equal quality' };
        if (ext === 'gif') return { format: 'webp', reason: 'WEBP is more efficient for static images than GIF' };
        if (ext === 'svg' && sizeKB > 100) return { format: 'png', reason: 'PNG works well for complex SVGs at fixed size' };
        return null;
    }

    async applyRotation(file, degrees) {
        const { img, url } = await this.loadImage(file); await this.yieldToMain();
        const swap = degrees === 90 || degrees === 270;
        const cw = swap ? img.naturalHeight : img.naturalWidth, ch = swap ? img.naturalWidth : img.naturalHeight;
        const canvas = document.createElement('canvas'); canvas.width = cw; canvas.height = ch;
        const ctx = canvas.getContext('2d');
        ctx.translate(cw/2, ch/2); ctx.rotate((degrees * Math.PI)/180);
        ctx.drawImage(img, -img.naturalWidth/2, -img.naturalHeight/2);
        URL.revokeObjectURL(url); await this.yieldToMain();
        return new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('Failed')), 'image/png'));
    }

    async applyFlip(file, direction) {
        const { img, url } = await this.loadImage(file); await this.yieldToMain();
        const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (direction === 'horizontal') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
        else { ctx.translate(0, canvas.height); ctx.scale(1, -1); }
        ctx.drawImage(img, 0, 0); URL.revokeObjectURL(url); await this.yieldToMain();
        return new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('Failed')), 'image/png'));
    }

    async applyFilter(file, filterType, value) {
        const { img, url } = await this.loadImage(file); await this.yieldToMain();
        const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (filterType === 'pixelate') {
            const ps = Math.max(2, parseInt(value) || 8);
            const w = img.naturalWidth, h = img.naturalHeight;
            const small = document.createElement('canvas');
            small.width = Math.ceil(w / ps); small.height = Math.ceil(h / ps);
            const sctx = small.getContext('2d');
            sctx.imageSmoothingEnabled = false;
            sctx.drawImage(img, 0, 0, small.width, small.height);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(small, 0, 0, small.width, small.height, 0, 0, w, h);
        } else {
            const filters = [];
            if (filterType === 'grayscale') filters.push('grayscale(100%)');
            if (filterType === 'brightness') filters.push(`brightness(${value}%)`);
            if (filterType === 'contrast') filters.push(`contrast(${value}%)`);
            if (filterType === 'saturate') filters.push(`saturate(${value}%)`);
            ctx.filter = filters.join(' ') || 'none';
            ctx.drawImage(img, 0, 0);
        }
        URL.revokeObjectURL(url); await this.yieldToMain();
        return new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('Failed')), 'image/png'));
    }

    canvasToIco(canvas) {
        const size = Math.min(canvas.width, canvas.height, 256);
        const r = document.createElement('canvas'); r.width = size; r.height = size;
        r.getContext('2d').drawImage(canvas, 0, 0, size, size);
        const id = r.getContext('2d').getImageData(0, 0, size, size);
        const bmp = this.createBmpFromImageData(id, size);
        const h = new ArrayBuffer(6), hv = new DataView(h);
        hv.setUint16(0,0,true); hv.setUint16(2,1,true); hv.setUint16(4,1,true);
        const e = new ArrayBuffer(16), ev = new DataView(e);
        ev.setUint8(0, size>=256?0:size); ev.setUint8(1, size>=256?0:size);
        ev.setUint16(4,1,true); ev.setUint16(6,32,true);
        ev.setUint32(8, bmp.byteLength, true); ev.setUint32(12, 22, true);
        return new Blob([h, e, bmp], { type: 'image/x-icon' });
    }

    createBmpFromImageData(imageData, size) {
        const ps = size*size*4, ms = Math.ceil(size/32)*4*size;
        const buf = new ArrayBuffer(40+ps+ms), v = new DataView(buf);
        v.setUint32(0,40,true); v.setInt32(4,size,true); v.setInt32(8,size*2,true);
        v.setUint16(12,1,true); v.setUint16(14,32,true); v.setUint32(20,ps+ms,true);
        const px = new Uint8Array(buf, 40, ps);
        for (let y=0;y<size;y++) for (let x=0;x<size;x++) {
            const s=((size-1-y)*size+x)*4, d=(y*size+x)*4;
            px[d]=imageData.data[s+2]; px[d+1]=imageData.data[s+1]; px[d+2]=imageData.data[s]; px[d+3]=imageData.data[s+3];
        }
        return buf;
    }

    getOutputFilename(originalName, format) {
        const base = originalName.replace(/\.[^.]+$/, ''), ext = this.FORMAT_EXT[format];
        if (this.namingMode === 'prefix') return 'converted-' + base + ext;
        if (this.namingMode === 'replace') return base + ext;
        return base + '-converted' + ext;
    }

    async createZip(files) {
        const zip = new JSZip();
        files.forEach(({ name, blob }) => zip.file(name, blob));
        return zip.generateAsync({ type: 'blob' });
    }
}

const converter = new ImageConverter();
