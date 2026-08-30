# GRAIL zipfile - the READ side of CPython's zipfile, over Grail's
# streaming zlib (zlib.decompressobj with raw-deflate wbits).
#
# Scope, deliberately: reading an archive produced by another tool is the
# whole point (kaggle ships datasets as .zip), so ZipFile/ZipInfo/namelist/
# infolist/open/read/extract/extractall are complete for the two methods
# that occur in practice -- 0 (stored) and 8 (deflated) -- including ZIP64
# archives.  Deviations from CPython, all V1:
#   * WRITING is not implemented (mode 'w'/'a'/'x' raise);
#   * bzip2 (12) and lzma (14) entries raise NotImplementedError, as
#     CPython does when the codec module is missing;
#   * encrypted entries raise NotImplementedError, not RuntimeError;
#   * ZipFile.printdir/testzip/setpassword are absent.
#
# extract() RESTORES NOTHING, and that is a MATCH, not a gap.  This file used
# to list "extract() does not restore permissions (Grail has no os.chmod)"
# among the deviations, which read as a deficiency to be fixed once os.chmod
# existed.  It is not one: CPython's ZipFile._extract_member writes the file
# and stops -- there is no chmod and no utime anywhere in CPython's zipfile,
# so a zip member's external_attr mode and its DOS date_time are BOTH dropped
# on extraction by CPython too, and an extracted file gets "now" and the
# process umask.  Wiring os.chmod/os.utime in here once they existed would
# therefore have been a DEVIATION introduced in the name of fidelity.  A
# caller that wants a zip member's recorded time has to read info.date_time
# and apply it, under CPython and here alike.  (tarfile is the opposite case:
# CPython's tarfile DOES restore mode and mtime, and Grail's now does too.)
#
# Note on _EndRecData: CPython scans backwards for the End Of Central
# Directory signature because a trailing archive comment may be up to 64KB.
# We do the same -- reading the last 64KB+22 bytes and searching for the
# signature -- rather than assuming the EOCD sits exactly at the end.

import io
import os
import struct
import zlib

__all__ = ["BadZipFile", "BadZipfile", "LargeZipFile", "ZipInfo", "ZipFile",
           "is_zipfile", "ZIP_STORED", "ZIP_DEFLATED", "ZIP_BZIP2", "ZIP_LZMA"]

ZIP_STORED = 0
ZIP_DEFLATED = 8
ZIP_BZIP2 = 12
ZIP_LZMA = 14

# Signatures, little-endian.
_EOCD_SIG = 0x06054B50           # end of central directory
_EOCD64_SIG = 0x06064B50         # zip64 end of central directory record
_EOCD64_LOC_SIG = 0x07064B50     # zip64 end of central directory locator
_CD_SIG = 0x02014B50             # central directory file header
_LFH_SIG = 0x04034B50            # local file header

_EOCD_SIZE = 22
_CD_FIXED = 46
_LFH_FIXED = 30
_MAX_COMMENT = 65535

_FLAG_ENCRYPTED = 0x1
_FLAG_UTF8 = 0x800

_READ_CHUNK = 65536


class BadZipFile(Exception):
    pass


# CPython keeps the 2.x spelling as an alias; requests/kaggle-era code uses it.
BadZipfile = BadZipFile


class LargeZipFile(Exception):
    """Raised when a ZIP64 construct is needed but disallowed."""
    pass


def _dos_to_date_time(dosdate, dostime):
    """Expand the DOS date/time pair into CPython's 6-tuple."""
    return ((dosdate >> 9) + 1980,
            (dosdate >> 5) & 0xF,
            dosdate & 0x1F,
            dostime >> 11,
            (dostime >> 5) & 0x3F,
            (dostime & 0x1F) * 2)


class ZipInfo(object):
    """One member of an archive.  The attribute names match CPython."""

    def __init__(self, filename="NoName", date_time=(1980, 1, 1, 0, 0, 0)):
        self.filename = filename
        self.date_time = date_time
        self.compress_type = ZIP_STORED
        self.comment = b""
        self.extra = b""
        self.create_system = 0
        self.create_version = 20
        self.extract_version = 20
        self.reserved = 0
        self.flag_bits = 0
        self.volume = 0
        self.internal_attr = 0
        self.external_attr = 0
        self.header_offset = 0
        self.CRC = 0
        self.compress_size = 0
        self.file_size = 0

    def is_dir(self):
        """CPython's test: a trailing separator in the stored name."""
        return self.filename[-1:] == "/"

    def __repr__(self):
        return ("<ZipInfo filename=" + repr(self.filename)
                + " compress_type=" + str(self.compress_type)
                + " file_size=" + str(self.file_size) + ">")


class ZipExtFile(object):
    """A readable stream over one archive member.

    Deflated members are inflated INCREMENTALLY through
    zlib.decompressobj(-15) -- raw deflate, no zlib header, which is what a
    zip entry holds -- so reading a large member never materialises the
    whole compressed body at once.
    """

    def __init__(self, fileobj, offset, compress_size, file_size,
                 compress_type, expected_crc, name):
        self._fileobj = fileobj
        self._offset = offset
        self._left = compress_size          # compressed bytes not yet read
        self._file_size = file_size
        self._compress_type = compress_type
        self._expected_crc = expected_crc
        self._running_crc = 0
        self._buf = b""                     # decompressed, not yet handed out
        self._pos = 0                       # decompressed bytes handed out
        self._eof = False
        self._closed = False
        self.name = name
        if compress_type == ZIP_DEFLATED:
            self._decomp = zlib.decompressobj(-15)
        elif compress_type == ZIP_STORED:
            self._decomp = None
        else:
            raise NotImplementedError(
                "compression method " + str(compress_type)
                + " is not supported by Grail's zipfile")

    def readable(self):
        return True

    def seekable(self):
        return False

    def _fill(self):
        """Pull one chunk of compressed input and expand it into _buf."""
        if self._eof:
            return
        if self._left <= 0:
            # Input exhausted; flush whatever the inflater still holds.
            if self._decomp is not None:
                self._buf = self._buf + self._decomp.flush()
            self._eof = True
            return
        n = self._left
        if n > _READ_CHUNK:
            n = _READ_CHUNK
        self._fileobj.seek(self._offset)
        raw = self._fileobj.read(n)
        if len(raw) != n:
            raise BadZipFile("truncated archive: expected " + str(n)
                             + " bytes at offset " + str(self._offset))
        self._offset = self._offset + n
        self._left = self._left - n
        if self._decomp is None:
            self._buf = self._buf + raw
        else:
            self._buf = self._buf + self._decomp.decompress(raw)
            if self._decomp.eof:
                self._left = 0

    def read(self, n=-1):
        if self._closed:
            raise ValueError("read from closed file")
        if n is None or n < 0:
            while not self._eof:
                self._fill()
            out = self._buf
            self._buf = b""
        else:
            while len(self._buf) < n and not self._eof:
                self._fill()
            out = self._buf[:n]
            self._buf = self._buf[n:]
        self._pos = self._pos + len(out)
        if len(out) > 0:
            self._running_crc = zlib.crc32(out, self._running_crc)
        if self._eof and len(self._buf) == 0:
            self._check_done()
        return out

    def _check_done(self):
        """Validate size and CRC once the member has been fully read.

        The CRC is the reason to bother: a wrong window size or a
        mis-parsed offset still produces plausible-looking bytes, and only
        the checksum the archive itself carries catches that.
        """
        if self._pos != self._file_size:
            raise BadZipFile("size mismatch for " + repr(self.name)
                             + ": got " + str(self._pos)
                             + ", header says " + str(self._file_size))
        if self._expected_crc is not None and self._running_crc != self._expected_crc:
            raise BadZipFile("Bad CRC-32 for file " + repr(self.name))

    def readline(self, limit=-1):
        out = b""
        while True:
            if limit is not None and limit >= 0 and len(out) >= limit:
                return out[:limit]
            ch = self.read(1)
            if len(ch) == 0:
                return out
            out = out + ch
            if ch == b"\n":
                return out

    def readlines(self):
        out = []
        while True:
            line = self.readline()
            if len(line) == 0:
                return out
            out.append(line)

    def __iter__(self):
        return self

    def __next__(self):
        line = self.readline()
        if len(line) == 0:
            raise StopIteration
        return line

    def tell(self):
        return self._pos

    def close(self):
        self._closed = True

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, tb):
        self.close()
        return False


class ZipFile(object):
    """Read an archive.  ``mode`` must be 'r' in Grail."""

    def __init__(self, file, mode="r", compression=ZIP_STORED, allowZip64=True,
                 compresslevel=None, strict_timestamps=True, metadata_encoding=None):
        if mode not in ("r", "w", "x", "a"):
            raise ValueError('ZipFile requires mode "r", "w", "x", or "a"')
        if mode != "r":
            raise NotImplementedError(
                "Grail's zipfile is read-only; mode " + repr(mode)
                + " is not implemented")
        self.mode = "r"
        self.debug = 0
        self.comment = b""
        self.NameToInfo = {}
        self.filelist = []
        self._closed = False
        if isinstance(file, str):
            self.filename = file
            self.fp = io.open(file, "rb")
            self._close_fp = True
        else:
            self.filename = getattr(file, "name", None)
            self.fp = file
            self._close_fp = False
        try:
            self._read_end_record()
            self._read_central_directory()
        except:
            if self._close_fp:
                self.fp.close()
            raise

    # ---------------------------------------------------------------- parsing

    def _read_end_record(self):
        self.fp.seek(0, 2)
        filesize = self.fp.tell()
        if filesize < _EOCD_SIZE:
            raise BadZipFile("File is not a zip file")
        # Search backwards over the largest legal comment for the signature.
        span = _EOCD_SIZE + _MAX_COMMENT
        if span > filesize:
            span = filesize
        self.fp.seek(filesize - span)
        tail = self.fp.read(span)
        idx = tail.rfind(b"PK\x05\x06")
        if idx < 0:
            raise BadZipFile("File is not a zip file")
        eocd = tail[idx:idx + _EOCD_SIZE]
        if len(eocd) < _EOCD_SIZE:
            raise BadZipFile("File is not a zip file")
        fields = struct.unpack("<IHHHHIIH", eocd)
        self._num_entries = fields[4]
        cd_size = fields[5]
        cd_offset = fields[6]
        comment_len = fields[7]
        self.comment = tail[idx + _EOCD_SIZE:idx + _EOCD_SIZE + comment_len]
        self._eocd_pos = filesize - span + idx
        # ZIP64: the 32-bit fields saturate at 0xFFFFFFFF/0xFFFF and the real
        # values live in the zip64 record the locator points at.
        if (cd_offset == 0xFFFFFFFF or cd_size == 0xFFFFFFFF
                or self._num_entries == 0xFFFF):
            cd_offset, cd_size = self._read_zip64_end_record(tail, idx, span, filesize)
        self._cd_offset = cd_offset
        self._cd_size = cd_size

    def _read_zip64_end_record(self, tail, idx, span, filesize):
        loc_start = idx - 20
        if loc_start < 0:
            raise BadZipFile("Corrupt zip64 end of central directory locator")
        loc = tail[loc_start:loc_start + 20]
        sig, disk, eocd64_offset, total_disks = struct.unpack("<IIQI", loc)
        if sig != _EOCD64_LOC_SIG:
            raise BadZipFile("Corrupt zip64 end of central directory locator")
        self.fp.seek(eocd64_offset)
        rec = self.fp.read(56)
        if len(rec) != 56:
            raise BadZipFile("Corrupt zip64 end of central directory record")
        (sig64, rec_size, made, needed, disk_no, cd_disk,
         entries_disk, entries_total, cd_size, cd_offset) = struct.unpack(
            "<IQHHIIQQQQ", rec)
        if sig64 != _EOCD64_SIG:
            raise BadZipFile("Corrupt zip64 end of central directory record")
        self._num_entries = entries_total
        return cd_offset, cd_size

    def _read_central_directory(self):
        self.fp.seek(self._cd_offset)
        data = self.fp.read(self._cd_size)
        if len(data) != self._cd_size:
            raise BadZipFile("Truncated central directory")
        pos = 0
        total = len(data)
        while pos + _CD_FIXED <= total:
            head = data[pos:pos + _CD_FIXED]
            fields = struct.unpack("<IHHHHHHIIIHHHHHII", head)
            if fields[0] != _CD_SIG:
                break
            name_len = fields[10]
            extra_len = fields[11]
            comment_len = fields[12]
            name_end = pos + _CD_FIXED + name_len
            extra_end = name_end + extra_len
            comment_end = extra_end + comment_len
            if comment_end > total:
                raise BadZipFile("Truncated central directory entry")
            raw_name = data[pos + _CD_FIXED:name_end]
            extra = data[name_end:extra_end]
            comment = data[extra_end:comment_end]
            flag_bits = fields[3]
            if flag_bits & _FLAG_UTF8:
                name = raw_name.decode("utf-8")
            else:
                # CPython uses cp437 here; Grail has no cp437 codec, and for
                # every name that is actually ASCII the two agree.  Fall back
                # to latin-1 so a non-ASCII name still round-trips as bytes
                # rather than raising.
                try:
                    name = raw_name.decode("ascii")
                except UnicodeDecodeError:
                    name = raw_name.decode("latin-1")
            info = ZipInfo(name)
            info.create_version = fields[1]
            info.create_system = fields[1] >> 8
            info.extract_version = fields[2]
            info.flag_bits = flag_bits
            info.compress_type = fields[4]
            info.date_time = _dos_to_date_time(fields[6], fields[5])
            info.CRC = fields[7]
            info.compress_size = fields[8]
            info.file_size = fields[9]
            info.volume = fields[13]
            info.internal_attr = fields[14]
            info.external_attr = fields[15]
            info.header_offset = fields[16]
            info.extra = extra
            info.comment = comment
            self._apply_zip64_extra(info)
            self.filelist.append(info)
            self.NameToInfo[info.filename] = info
            pos = comment_end
        return self.filelist

    def _apply_zip64_extra(self, info):
        """Replace saturated 32-bit fields from the 0x0001 extra block.

        Order matters and is positional, not tagged: only the fields that
        actually saturated are present, in the fixed order size, compressed
        size, header offset, disk number.
        """
        needed = []
        if info.file_size == 0xFFFFFFFF:
            needed.append("file_size")
        if info.compress_size == 0xFFFFFFFF:
            needed.append("compress_size")
        if info.header_offset == 0xFFFFFFFF:
            needed.append("header_offset")
        if len(needed) == 0:
            return
        extra = info.extra
        pos = 0
        while pos + 4 <= len(extra):
            tag, size = struct.unpack("<HH", extra[pos:pos + 4])
            body = extra[pos + 4:pos + 4 + size]
            if tag == 0x0001:
                bpos = 0
                for field in needed:
                    if bpos + 8 > len(body):
                        break
                    value = struct.unpack("<Q", body[bpos:bpos + 8])[0]
                    setattr(info, field, value)
                    bpos = bpos + 8
                return
            pos = pos + 4 + size

    def _data_offset(self, info):
        """Where an entry's payload starts.

        The central directory's header_offset points at the LOCAL header,
        whose name/extra lengths may differ from the central copy -- so the
        local header has to be read; deriving the offset from the central
        entry's own lengths is a classic way to read a few bytes off.
        """
        self.fp.seek(info.header_offset)
        head = self.fp.read(_LFH_FIXED)
        if len(head) != _LFH_FIXED:
            raise BadZipFile("Truncated local header for " + repr(info.filename))
        fields = struct.unpack("<IHHHHHIIIHH", head)
        if fields[0] != _LFH_SIG:
            raise BadZipFile("Bad magic number for file header: "
                             + repr(info.filename))
        name_len = fields[9]
        extra_len = fields[10]
        return info.header_offset + _LFH_FIXED + name_len + extra_len

    # ----------------------------------------------------------------- public

    def namelist(self):
        return [info.filename for info in self.filelist]

    def infolist(self):
        return self.filelist

    def getinfo(self, name):
        info = self.NameToInfo.get(name)
        if info is None:
            raise KeyError("There is no item named " + repr(name)
                           + " in the archive")
        return info

    def open(self, name, mode="r", pwd=None, force_zip64=False):
        if mode not in ("r", "rb"):
            raise NotImplementedError(
                "Grail's zipfile is read-only; ZipFile.open mode "
                + repr(mode) + " is not implemented")
        if self._closed:
            raise ValueError("Attempt to use ZIP archive that was already closed")
        if isinstance(name, ZipInfo):
            info = name
        else:
            info = self.getinfo(name)
        if pwd is not None or (info.flag_bits & _FLAG_ENCRYPTED):
            raise NotImplementedError(
                "encrypted zip entries are not supported by Grail")
        offset = self._data_offset(info)
        return ZipExtFile(self.fp, offset, info.compress_size, info.file_size,
                          info.compress_type, info.CRC, info.filename)

    def read(self, name, pwd=None):
        f = self.open(name, "r", pwd)
        try:
            return f.read()
        finally:
            f.close()

    def _sanitize(self, name):
        """Turn an archive member name into a safe relative path.

        Absolute paths and ``..`` components are stripped, as CPython does:
        an archive is untrusted input, and without this an entry named
        ``../../etc/x`` writes outside the target directory.
        """
        name = name.replace("\\", "/")
        parts = []
        for part in name.split("/"):
            if part == "" or part == ".":
                continue
            if part == "..":
                continue
            parts.append(part)
        return parts

    def extract(self, member, path=None, pwd=None):
        if isinstance(member, ZipInfo):
            info = member
        else:
            info = self.getinfo(member)
        if path is None:
            path = os.getcwd()
        parts = self._sanitize(info.filename)
        target = path
        for part in parts:
            target = os.path.join(target, part)
        if info.is_dir():
            if not os.path.isdir(target):
                os.makedirs(target)
            return target
        parent = os.path.dirname(target)
        if parent != "" and not os.path.isdir(parent):
            os.makedirs(parent)
        src = self.open(info, "r", pwd)
        try:
            out = io.open(target, "wb")
            try:
                while True:
                    chunk = src.read(_READ_CHUNK)
                    if len(chunk) == 0:
                        break
                    out.write(chunk)
            finally:
                out.close()
        finally:
            src.close()
        return target

    def extractall(self, path=None, members=None, pwd=None):
        if members is None:
            members = self.filelist
        for member in members:
            self.extract(member, path, pwd)

    def close(self):
        if self._closed:
            return
        self._closed = True
        if self._close_fp and self.fp is not None:
            self.fp.close()
        self.fp = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, tb):
        self.close()
        return False

    def __repr__(self):
        return "<ZipFile filename=" + repr(self.filename) + " mode='r'>"


def is_zipfile(filename):
    """True if ``filename`` (a path or a seekable file object) looks like a zip."""
    try:
        if isinstance(filename, str):
            fp = io.open(filename, "rb")
            try:
                return _check_zipfile(fp)
            finally:
                fp.close()
        return _check_zipfile(filename)
    except OSError:
        return False


def _check_zipfile(fp):
    try:
        fp.seek(0, 2)
        size = fp.tell()
        if size < _EOCD_SIZE:
            return False
        span = _EOCD_SIZE + _MAX_COMMENT
        if span > size:
            span = size
        fp.seek(size - span)
        tail = fp.read(span)
        return tail.rfind(b"PK\x05\x06") >= 0
    except (OSError, BadZipFile):
        return False
