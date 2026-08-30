# GRAIL tarfile - the READ side of CPython's tarfile, over Grail's
# streaming zlib.
#
# Scope, deliberately: reading an archive produced by another tool
# (kaggle ships models as .tar.gz) is the whole point, so
# open/getmembers/getnames/getmember/extractfile/extract/extractall and
# iteration are complete for ustar, GNU-long-name and PAX archives.
# Deviations from CPython, all V1:
#   * WRITING is not implemented (modes 'w'/'a'/'x' raise);
#   * bz2 ('r:bz2') and xz ('r:xz') raise CompressionError -- Grail has
#     neither codec;
#   * extract() restores MODE and MTIME but not OWNER -- see "WHAT
#     extract() RESTORES" below;
#   * symlinks and hardlinks are recorded on the TarInfo but are not
#     recreated on extract -- they are skipped with no error;
#   * TarFile.add/gettarinfo/list are absent.
#
# WHAT extract() RESTORES, and by whose rules.  CPython 3.14 extracts through
# a FILTER, and the default is the ``data'' filter, which does not restore a
# member's mode verbatim -- it clamps it.  Grail does not implement the filter
# protocol (the `filter' argument is accepted and ignored), so what it does
# instead is apply the data filter's MODE RULES unconditionally, which is what
# CPython 3.14's own default extract lands on.  Concretely, in
# _filtered_mode() below:
#
#   * mode &= 0o755 -- so setuid, setgid, the sticky bit and every group- or
#     other-WRITE bit an archive asks for are dropped.  An archive is untrusted
#     input; "the tar said 0o4777" is not a reason to create a setuid file.
#   * a regular file that is not owner-executable loses its other execute bits,
#     and always gains 0o600, so the extracting user can read what they got.
#   * a DIRECTORY's mode is dropped entirely (CPython's data filter sets it to
#     None and tarfile then skips the chmod), so directories are created with
#     the process umask, exactly as CPython leaves them.
#
# So Grail's extract is never MORE permissive than CPython 3.14's default, and
# for the ordinary 0o644/0o755 members that make up real archives it is
# identical.  MTIME is restored verbatim, on files and on directories.  OWNER
# is not restored at all: the data filter drops uid/gid too, and there is no
# os.chown here regardless.  A directory's attributes are applied by
# extractall() only AFTER every member has been written, in reverse name order
# -- CPython does the same, because writing a file into a directory resets that
# directory's mtime.
#
# HOW A GZIPPED ARCHIVE IS READ.  tar wants random access: getmembers()
# scans every header, and extractfile() then seeks back to a member's data.
# A raw inflate stream gives neither.  So 'r:gz' inflates the source into a
# TEMP FILE in bounded-size chunks and reads that, rather than holding the
# expanded archive in memory -- a model tarball is exactly the case where
# the in-memory shortcut would hurt.  The temp file is removed by close().

import io
import os
import time
import zlib

__all__ = ["TarFile", "TarInfo", "TarError", "ReadError", "CompressionError",
           "ExtractError", "HeaderError", "open", "is_tarfile",
           "REGTYPE", "AREGTYPE", "DIRTYPE", "SYMTYPE", "LNKTYPE"]

BLOCKSIZE = 512
RECORDSIZE = BLOCKSIZE * 20
GNU_MAGIC = b"ustar  \x00"
POSIX_MAGIC = b"ustar\x0000"

REGTYPE = b"0"
AREGTYPE = b"\0"
LNKTYPE = b"1"
SYMTYPE = b"2"
CHRTYPE = b"3"
BLKTYPE = b"4"
DIRTYPE = b"5"
FIFOTYPE = b"6"
CONTTYPE = b"7"
GNUTYPE_LONGNAME = b"L"
GNUTYPE_LONGLINK = b"K"
GNUTYPE_SPARSE = b"S"
XHDTYPE = b"x"
XGLTYPE = b"g"
SOLARIS_XHDTYPE = b"X"

REGULAR_TYPES = (REGTYPE, AREGTYPE, CONTTYPE, GNUTYPE_SPARSE)

_COPY_CHUNK = 65536
_tmp_counter = [0]


class TarError(Exception):
    pass


class ExtractError(TarError):
    pass


class ReadError(TarError):
    pass


class CompressionError(TarError):
    pass


class StreamError(TarError):
    pass


class HeaderError(TarError):
    pass


class InvalidHeaderError(HeaderError):
    pass


class EmptyHeaderError(HeaderError):
    pass


class TruncatedHeaderError(HeaderError):
    pass


class EOFHeaderError(HeaderError):
    pass


def _decode(data):
    """Bytes to str, never raising.

    CPython uses errors='surrogateescape' so a non-UTF-8 name survives a
    round trip; Grail has no surrogateescape, and latin-1 is the fallback
    that maps every byte to exactly one code point.  It matters in
    practice: bsdtar writes SCHILY.xattr PAX records whose VALUES are raw
    binary, and an unguarded utf-8 decode there makes a perfectly readable
    archive raise UnicodeDecodeError out of getmembers().
    """
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("latin-1")


def _nts(data):
    """Decode a NUL-terminated header string field."""
    i = data.find(b"\0")
    if i >= 0:
        data = data[:i]
    return _decode(data)


def _nti(data):
    """Decode a numeric header field.

    Normally octal ASCII.  GNU writes values too large for the field
    (sizes over 8GB, uid/gid over 2097151) in base-256 with the top bit of
    the first byte set -- without this branch such an archive reads as a
    header checksum error rather than as the large file it is.
    """
    if len(data) > 0 and (data[0] & 0x80):
        first = data[0] & 0x7F
        if data[0] & 0x40:
            # negative value, stored two's complement
            first = data[0] | ~0x7F
        n = first
        for byte in data[1:]:
            n = (n << 8) + byte
        return n
    s = data.replace(b"\0", b" ").strip()
    if len(s) == 0:
        return 0
    try:
        return int(s.decode("ascii"), 8)
    except ValueError:
        raise InvalidHeaderError("invalid header value " + repr(data))


def _temp_path(suffix):
    _tmp_counter[0] = _tmp_counter[0] + 1
    return ("/tmp/grail_tarfile_" + str(time.time_ns()) + "_"
            + str(_tmp_counter[0]) + suffix)


class TarInfo(object):
    """One member of an archive.  Attribute names match CPython."""

    def __init__(self, name=""):
        self.name = name
        self.mode = 0o644
        self.uid = 0
        self.gid = 0
        self.size = 0
        self.mtime = 0
        self.chksum = 0
        self.type = REGTYPE
        self.linkname = ""
        self.uname = ""
        self.gname = ""
        self.devmajor = 0
        self.devminor = 0
        self.offset = 0            # offset of this member's header block
        self.offset_data = 0       # offset of this member's payload
        self.pax_headers = {}
        self.sparse = None

    def isreg(self):
        return self.type in REGULAR_TYPES

    def isfile(self):
        return self.isreg()

    def isdir(self):
        return self.type == DIRTYPE

    def issym(self):
        return self.type == SYMTYPE

    def islnk(self):
        return self.type == LNKTYPE

    def ischr(self):
        return self.type == CHRTYPE

    def isblk(self):
        return self.type == BLKTYPE

    def isfifo(self):
        return self.type == FIFOTYPE

    def isdev(self):
        return self.type in (CHRTYPE, BLKTYPE, FIFOTYPE)

    def get_info(self):
        return {"name": self.name, "mode": self.mode, "uid": self.uid,
                "gid": self.gid, "size": self.size, "mtime": self.mtime,
                "type": self.type, "linkname": self.linkname,
                "uname": self.uname, "gname": self.gname}

    def __repr__(self):
        return ("<TarInfo " + repr(self.name) + " size=" + str(self.size)
                + " type=" + repr(self.type) + ">")

    @staticmethod
    def frombuf(buf):
        """Parse one 512-byte header block into a TarInfo."""
        if len(buf) == 0:
            raise EmptyHeaderError("empty header")
        if len(buf) != BLOCKSIZE:
            raise TruncatedHeaderError("truncated header")
        if buf.count(b"\0") == BLOCKSIZE:
            raise EOFHeaderError("end of file header")
        chksum = _nti(buf[148:156])
        if chksum not in _calc_chksums(buf):
            raise InvalidHeaderError("bad checksum")
        info = TarInfo()
        info.name = _nts(buf[0:100])
        info.mode = _nti(buf[100:108])
        info.uid = _nti(buf[108:116])
        info.gid = _nti(buf[116:124])
        info.size = _nti(buf[124:136])
        info.mtime = _nti(buf[136:148])
        info.chksum = chksum
        info.type = buf[156:157]
        info.linkname = _nts(buf[157:257])
        info.uname = _nts(buf[265:297])
        info.gname = _nts(buf[297:329])
        try:
            info.devmajor = _nti(buf[329:337])
            info.devminor = _nti(buf[337:345])
        except InvalidHeaderError:
            info.devmajor = 0
            info.devminor = 0
        prefix = _nts(buf[345:500])
        # A ustar archive splits a long path across prefix + name.
        if prefix and info.type != GNUTYPE_SPARSE:
            info.name = prefix + "/" + info.name
        # A directory member conventionally ends in '/'; CPython strips it.
        if info.isdir():
            info.name = info.name.rstrip("/")
        return info


def _calc_chksums(buf):
    """Header checksum, computed with the checksum field read as spaces.

    Both the signed and unsigned sums are returned: historic tars disagreed
    on whether the bytes are signed, and an archive written by one is
    rejected by a reader that only computes the other.
    """
    unsigned = 0
    signed = 0
    for i in range(BLOCKSIZE):
        if 148 <= i < 156:
            b = 32
        else:
            b = buf[i]
        unsigned = unsigned + b
        if b > 127:
            signed = signed + (b - 256)
        else:
            signed = signed + b
    return (unsigned, signed)


class ExFileObject(object):
    """A readable stream over one member's payload."""

    def __init__(self, tarfileobj, tarinfo):
        self._fp = tarfileobj.fileobj
        self._start = tarinfo.offset_data
        self._size = tarinfo.size
        self._pos = 0
        self._closed = False
        self.name = tarinfo.name

    def readable(self):
        return True

    def seekable(self):
        return True

    def read(self, n=-1):
        if self._closed:
            raise ValueError("read from closed file")
        left = self._size - self._pos
        if left <= 0:
            return b""
        if n is None or n < 0 or n > left:
            n = left
        self._fp.seek(self._start + self._pos)
        data = self._fp.read(n)
        self._pos = self._pos + len(data)
        return data

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

    def seek(self, pos, whence=0):
        if whence == 0:
            self._pos = pos
        elif whence == 1:
            self._pos = self._pos + pos
        elif whence == 2:
            self._pos = self._size + pos
        else:
            raise ValueError("whence must be 0, 1, or 2")
        if self._pos < 0:
            self._pos = 0
        return self._pos

    def close(self):
        self._closed = True

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, tb):
        self.close()
        return False


def _sniff_compression(path):
    """Look at the magic bytes rather than trusting the file extension."""
    f = io.open(path, "rb")
    try:
        head = f.read(6)
    finally:
        f.close()
    if len(head) >= 2 and head[0] == 0x1F and head[1] == 0x8B:
        return "gz"
    if len(head) >= 3 and head[0:3] == b"BZh":
        return "bz2"
    if len(head) >= 6 and head[0:6] == b"\xfd7zXZ\x00":
        return "xz"
    return ""


def _inflate_to_temp(path):
    """Inflate a gzip file into a temp file, in bounded chunks.

    Returns the temp file's path.  wbits 47 is 'auto-detect zlib or gzip'
    with a 32K window, so this reads the gzip framing directly rather than
    routing through a second module.
    """
    src = io.open(path, "rb")
    out_path = _temp_path(".tar")
    out = io.open(out_path, "wb")
    try:
        d = zlib.decompressobj(47)
        while True:
            chunk = src.read(_COPY_CHUNK)
            if len(chunk) == 0:
                break
            expanded = d.decompress(chunk)
            if len(expanded) > 0:
                out.write(expanded)
            if d.eof:
                # A concatenated multi-member gzip file continues with a new
                # stream in unused_data; keep going until the input runs out.
                leftover = d.unused_data
                if len(leftover) == 0:
                    continue
                d = zlib.decompressobj(47)
                expanded = d.decompress(leftover)
                if len(expanded) > 0:
                    out.write(expanded)
        tailing = d.flush()
        if len(tailing) > 0:
            out.write(tailing)
    except zlib.error as e:
        out.close()
        src.close()
        try:
            os.remove(out_path)
        except OSError:
            pass
        raise ReadError("not a gzip file: " + str(e))
    out.close()
    src.close()
    return out_path


class TarFile(object):
    """Read a tar archive."""

    def __init__(self, name=None, mode="r", fileobj=None, _temp=None):
        if mode != "r":
            raise NotImplementedError(
                "Grail's tarfile is read-only; mode " + repr(mode)
                + " is not implemented")
        self.name = name
        self.mode = "r"
        self.fileobj = fileobj
        self._temp = _temp            # temp file to unlink on close()
        # Every path that hands us a fileobj is one we opened ourselves (the
        # gz temp file), so closing it here is always right.
        self._close_fp = True
        if self.fileobj is None:
            self.fileobj = io.open(name, "rb")
        self.members = []
        self._loaded = False
        self.offset = 0
        self._closed = False
        self.pax_headers = {}

    # ------------------------------------------------------------- scanning

    def next(self):
        """Read the next member header, or None at the end of the archive."""
        if self._closed:
            raise OSError("TarFile is closed")
        pax = None
        gnu_name = None
        gnu_link = None
        while True:
            # Seek EVERY iteration, not once before the loop: reading a
            # metadata member's body (_read_at, for PAX/GNU-longname) moves
            # the file position, so a loop that only seeks up front reads
            # the next header from the wrong offset and reports a bad
            # checksum for a perfectly good archive.
            self.fileobj.seek(self.offset)
            buf = self.fileobj.read(BLOCKSIZE)
            try:
                info = TarInfo.frombuf(buf)
            except EOFHeaderError:
                self.offset = self.offset + BLOCKSIZE
                return None
            except EmptyHeaderError:
                return None
            except TruncatedHeaderError:
                if self.offset == 0:
                    raise ReadError("empty or truncated file")
                return None
            except InvalidHeaderError:
                if self.offset == 0:
                    raise ReadError("file could not be opened successfully")
                raise
            info.offset = self.offset
            info.offset_data = self.offset + BLOCKSIZE
            nblocks = (info.size + BLOCKSIZE - 1) // BLOCKSIZE
            next_offset = info.offset_data + nblocks * BLOCKSIZE
            # Metadata-only members carry the NEXT member's name or attributes.
            if info.type == GNUTYPE_LONGNAME:
                gnu_name = _nts(self._read_at(info.offset_data, info.size))
                self.offset = next_offset
                continue
            if info.type == GNUTYPE_LONGLINK:
                gnu_link = _nts(self._read_at(info.offset_data, info.size))
                self.offset = next_offset
                continue
            if info.type in (XHDTYPE, SOLARIS_XHDTYPE):
                pax = _parse_pax(self._read_at(info.offset_data, info.size))
                self.offset = next_offset
                continue
            if info.type == XGLTYPE:
                self.pax_headers.update(
                    _parse_pax(self._read_at(info.offset_data, info.size)))
                self.offset = next_offset
                continue
            if gnu_name is not None:
                info.name = gnu_name
            if gnu_link is not None:
                info.linkname = gnu_link
            merged = {}
            merged.update(self.pax_headers)
            if pax is not None:
                merged.update(pax)
            if len(merged) > 0:
                info.pax_headers = merged
                if "path" in merged:
                    info.name = merged["path"]
                if "linkpath" in merged:
                    info.linkname = merged["linkpath"]
                if "size" in merged:
                    info.size = int(merged["size"])
                    nblocks = (info.size + BLOCKSIZE - 1) // BLOCKSIZE
                    next_offset = info.offset_data + nblocks * BLOCKSIZE
                if "mtime" in merged:
                    info.mtime = float(merged["mtime"])
                if "uid" in merged:
                    info.uid = int(merged["uid"])
                if "gid" in merged:
                    info.gid = int(merged["gid"])
                if "uname" in merged:
                    info.uname = merged["uname"]
                if "gname" in merged:
                    info.gname = merged["gname"]
            self.offset = next_offset
            self.members.append(info)
            return info

    def _read_at(self, offset, size):
        self.fileobj.seek(offset)
        data = self.fileobj.read(size)
        if len(data) != size:
            raise ReadError("unexpected end of data")
        return data

    def _load(self):
        while True:
            info = self.next()
            if info is None:
                break
        self._loaded = True

    # --------------------------------------------------------------- public

    def getmembers(self):
        if not self._loaded:
            self._load()
        return self.members

    def getnames(self):
        return [m.name for m in self.getmembers()]

    def getmember(self, name):
        members = self.getmembers()
        # CPython returns the LAST match: a later member shadows an earlier
        # one of the same name, which is how tar records an update.
        found = None
        for m in members:
            if m.name == name:
                found = m
        if found is None:
            raise KeyError("filename " + repr(name) + " not found")
        return found

    def extractfile(self, member):
        if isinstance(member, str):
            info = self.getmember(member)
        else:
            info = member
        if info.isreg():
            return ExFileObject(self, info)
        if info.type in (LNKTYPE, SYMTYPE):
            # CPython follows the link within the archive.
            return self.extractfile(self.getmember(info.linkname))
        return None

    def _filtered_mode(self, info):
        """The mode to give a member, by CPython 3.14's ``data'' filter rules.

        Answers None for "do not chmod at all", which is what the data filter
        says for a directory (and what a symlink would get, if Grail recreated
        them).  See the module header for why the clamping is unconditional.
        """
        mode = info.mode
        if mode is None:
            return None
        mode = mode & 0o755
        if not info.isreg():
            return None
        if not mode & 0o100:
            mode = mode & ~0o111
        return mode | 0o600

    def _set_attrs(self, info, target):
        """Restore a member's mode and mtime onto the extracted path.

        os.chmod and os.utime read the result back themselves and raise if it
        did not take, so an ExtractError here means the filesystem refused --
        not that the call was quietly skipped.
        """
        mode = self._filtered_mode(info)
        if mode is not None:
            try:
                os.chmod(target, mode)
            except OSError:
                raise ExtractError("could not change mode")
        mtime = info.mtime
        if mtime is not None:
            try:
                os.utime(target, (mtime, mtime))
            except OSError:
                raise ExtractError("could not change modification time")

    def _sanitize(self, name):
        """Strip absolute paths and '..' -- an archive is untrusted input."""
        name = name.replace("\\", "/")
        parts = []
        for part in name.split("/"):
            if part == "" or part == "." or part == "..":
                continue
            parts.append(part)
        return parts

    def extract(self, member, path="", set_attrs=True, numeric_owner=False,
                filter=None):
        if isinstance(member, str):
            info = self.getmember(member)
        else:
            info = member
        if path == "" or path is None:
            path = os.getcwd()
        parts = self._sanitize(info.name)
        if len(parts) == 0:
            return None
        target = path
        for part in parts:
            target = os.path.join(target, part)
        if info.isdir():
            if not os.path.isdir(target):
                os.makedirs(target)
            if set_attrs:
                self._set_attrs(info, target)
            return target
        if not info.isreg():
            # Links and devices are recorded but not recreated in Grail.
            return None
        parent = os.path.dirname(target)
        if parent != "" and not os.path.isdir(parent):
            os.makedirs(parent)
        src = ExFileObject(self, info)
        out = io.open(target, "wb")
        try:
            while True:
                chunk = src.read(_COPY_CHUNK)
                if len(chunk) == 0:
                    break
                out.write(chunk)
        finally:
            out.close()
            src.close()
        if set_attrs:
            self._set_attrs(info, target)
        return target

    def _member_target(self, info, path):
        parts = self._sanitize(info.name)
        if len(parts) == 0:
            return None
        target = path
        for part in parts:
            target = os.path.join(target, part)
        return target

    def extractall(self, path=".", members=None, numeric_owner=False,
                   filter=None):
        if members is None:
            members = self.getmembers()
        # Directories first, so a member arriving before its parent still lands.
        dirs = [m for m in members if m.isdir()]
        for m in dirs:
            # set_attrs=False: a directory's mtime is applied at the END, below,
            # because writing a file into a directory resets that directory's
            # mtime and would undo the stamp.  CPython defers it the same way.
            self.extract(m, path, False)
        for m in members:
            if not m.isdir():
                self.extract(m, path)
        # Reverse name order, so a nested directory is stamped before the
        # parent that contains it.
        for m in sorted(dirs, key=lambda a: a.name, reverse=True):
            target = self._member_target(m, path)
            if target is not None and os.path.isdir(target):
                self._set_attrs(m, target)

    def close(self):
        if self._closed:
            return
        self._closed = True
        if self._close_fp and self.fileobj is not None:
            self.fileobj.close()
        self.fileobj = None
        if self._temp is not None:
            try:
                os.remove(self._temp)
            except OSError:
                pass
            self._temp = None

    def __iter__(self):
        return iter(self.getmembers())

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, tb):
        self.close()
        return False

    def __repr__(self):
        return "<TarFile " + repr(self.name) + " mode='r'>"


def _parse_pax(data):
    """Parse PAX extended header records: 'LEN key=value\\n'."""
    out = {}
    pos = 0
    total = len(data)
    while pos < total:
        sp = data.find(b" ", pos)
        if sp < 0:
            break
        try:
            length = int(data[pos:sp].decode("ascii"))
        except ValueError:
            break
        if length <= 0 or pos + length > total:
            break
        record = data[sp + 1:pos + length]
        if record.endswith(b"\n"):
            record = record[:-1]
        eq = record.find(b"=")
        if eq >= 0:
            out[_decode(record[:eq])] = _decode(record[eq + 1:])
        pos = pos + length
    return out


def open(name=None, mode="r", fileobj=None, bufsize=RECORDSIZE, **kwargs):
    """tarfile.open(name, mode) -- 'r', 'r:', 'r:gz' and 'r:*' are supported."""
    if fileobj is not None and name is None:
        raise NotImplementedError(
            "Grail's tarfile.open needs a filename; fileobj= is not supported")
    if mode.startswith("w") or mode.startswith("a") or mode.startswith("x"):
        raise NotImplementedError(
            "Grail's tarfile is read-only; mode " + repr(mode)
            + " is not implemented")
    if ":" in mode:
        parts = mode.split(":", 1)
        base = parts[0]
        comp = parts[1]
    else:
        base = mode
        comp = "*"
    if base not in ("r", ""):
        raise ValueError("mode must be 'r', 'r:', 'r:gz' or 'r:*'")
    if comp in ("", "tar"):
        detected = ""
    elif comp == "*":
        detected = _sniff_compression(name)
    else:
        detected = comp
    if detected in ("bz2", "xz"):
        raise CompressionError(
            detected + " compression is not available in Grail")
    if detected == "gz":
        actual = _sniff_compression(name)
        if actual != "gz":
            raise ReadError("not a gzip file")
        temp = _inflate_to_temp(name)
        try:
            return TarFile(name=name, mode="r",
                           fileobj=io.open(temp, "rb"), _temp=temp)
        except:
            try:
                os.remove(temp)
            except OSError:
                pass
            raise
    if detected not in ("", "tar"):
        raise CompressionError("unsupported compression " + repr(detected))
    return TarFile(name=name, mode="r")


def is_tarfile(name):
    """True if ``name`` looks like a tar archive Grail can read."""
    try:
        t = open(name, "r")
    except (TarError, OSError, ValueError):
        return False
    try:
        return t.next() is not None
    except TarError:
        return False
    finally:
        t.close()
