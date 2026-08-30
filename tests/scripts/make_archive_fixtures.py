#!/usr/bin/env python3
"""Regenerate the archive fixtures embedded in the Grail SUnit tests.

WHY THE FIXTURES ARE CPYTHON-PRODUCED.  Grail's zipfile/tarfile are
read-only, so a Grail-writes-then-Grail-reads test is impossible -- which
is just as well, since it could pass with both halves wrong.  Every
fixture here is written by CPython's own zipfile/tarfile (or hand-
assembled and then VERIFIED with CPython's zipfile, for the ZIP64 case
that needs constructs CPython only emits for multi-gigabyte archives), so
reading one back in Grail is a round trip against another implementation.

The archives stay small while the DECOMPRESSED content is large: a
320000-byte repetitive payload deflates to under a kilobyte, so the hex
literal is compact and still forces the reader across many buffer
boundaries.

Usage:
    python3 tests/scripts/make_archive_fixtures.py          # print hex
    python3 tests/scripts/make_archive_fixtures.py --check  # verify only

The printed hex is pasted into:
    src/smalltalk/PythonTests/ZipfileTestCase.gs
    src/smalltalk/PythonTests/TarfileTestCase.gs
"""

import gzip
import io
import struct
import sys
import tarfile
import zipfile
import zlib

# Every fixture must be BYTE-REPRODUCIBLE, so check_embedded() can tell a
# hand-edited hex literal from a regenerated one.  That means pinning every
# timestamp: a zip entry carries a DOS date/time, and a gzip member carries
# an mtime, so both default to "now" and would make this script emit
# different bytes on every run.
FIXED_DATE_TIME = (2024, 1, 1, 0, 0, 0)
FIXED_MTIME = 1700000000

BIG = b"0123456789abcdef" * 20000          # 320000 bytes
NESTED = b"nested payload\n" * 3
STORED = bytes(range(128))


def make_zip():
    """A multi-entry zip: deflated, empty, stored, large, and nested."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        def put(name, data, method):
            info = zipfile.ZipInfo(name, date_time=FIXED_DATE_TIME)
            info.compress_type = method
            info.external_attr = 0o600 << 16
            z.writestr(info, data)

        put("hello.txt", b"hello world\n", zipfile.ZIP_DEFLATED)
        put("empty.txt", b"", zipfile.ZIP_DEFLATED)
        put("stored.bin", STORED, zipfile.ZIP_STORED)
        put("big.txt", BIG, zipfile.ZIP_DEFLATED)
        put("sub/nested.txt", NESTED, zipfile.ZIP_DEFLATED)
    return buf.getvalue()


def make_tar_gz():
    """A gzipped tar with the same shape, plus two directory members.

    The test decompresses this to get a PLAIN tar too, so one compact
    fixture exercises both the 'r:' and 'r:gz' paths.
    """
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w") as t:
        def add(name, data, mtime=FIXED_MTIME):
            info = tarfile.TarInfo(name)
            info.size = len(data)
            info.mtime = mtime
            info.mode = 0o644
            t.addfile(info, io.BytesIO(data))

        def adddir(name, mtime=FIXED_MTIME):
            info = tarfile.TarInfo(name)
            info.type = tarfile.DIRTYPE
            info.mode = 0o755
            info.mtime = mtime
            t.addfile(info)

        adddir("src")
        add("src/hello.txt", b"hello tar\n")
        add("src/empty.txt", b"")
        add("src/big.bin", BIG)
        adddir("src/sub")
        add("src/sub/nested.txt", NESTED)
    return gzip.compress(buf.getvalue(), mtime=0)


LONGNAME = ("src/"
            + "/".join("averylongdirectorycomponent%02d" % i for i in range(5))
            + "/deep.txt")            # 162 chars -- past the 100-char name field


def make_tar_meta_gz(fmt):
    """A tar whose members are preceded by METADATA-ONLY header blocks.

    This is the shape that catches a reader which forgets that consuming a
    metadata member moves the file position: PAX_FORMAT emits a
    ``././@PaxHeader`` member before each real one, and GNU_FORMAT emits a
    typeflag-'L' long-name member, and in both cases the NEXT header must be
    read from the recomputed offset.  A reader that seeks only once reports a
    bad checksum on a perfectly good archive -- which is exactly the bug this
    fixture exists to keep fixed.
    """
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w", format=fmt) as t:
        for name, data in ((LONGNAME, b"deep payload\n"),
                           ("src/plain.txt", b"plain\n")):
            info = tarfile.TarInfo(name)
            info.size = len(data)
            info.mtime = FIXED_MTIME
            info.mode = 0o644
            if fmt == tarfile.PAX_FORMAT:
                info.pax_headers = {"GRAIL.note": "forces a pax header"}
            t.addfile(info, io.BytesIO(data))
    return gzip.compress(buf.getvalue(), mtime=0)


# The metadata archives, for tests/python/archive_metadata.py.
#
# Every mode below is chosen so that a NO-OP chmod scores a difference.  The
# obvious modes -- 0o644 for a file, 0o755 for a directory -- are exactly what
# a freshly created file gets under the usual umask, so an extract() that
# restored nothing would still land on them and pass.  These do not: 0o600 is
# more restrictive than the default, 0o755 on a FILE is more permissive, and
# 0o777/0o4755 are values CPython 3.14's data filter deliberately refuses to
# reproduce.  Likewise every mtime is a fixed instant years in the past, so
# "the file is new, so its mtime is already now" cannot pass for restoration.
#
# HOSTILE_NAME is a member whose NAME is shell syntax.  os.chmod and os.utime
# both put the extracted path on a command line, so an archive supplies the
# text of a command here; the fixture checks both that the member's metadata
# landed and that the command the semicolons introduce never ran.
MODE_MARKER = "grail_extract_pwned_marker"
HOSTILE_NAME = "m/od'd ; touch %s ; x.txt" % MODE_MARKER

MODE_MEMBERS = (
    # (name, payload, mode, mtime)
    ("m/private.txt", b"secret\n", 0o600, 1000000000),
    ("m/run.sh", b"#!/bin/sh\n", 0o755, 1100000000),
    ("m/wide.txt", b"wide open\n", 0o777, 1200000000),
    ("m/setuid.bin", b"suid\n", 0o4755, 1250000000),
    (HOSTILE_NAME, b"quoted\n", 0o600, 1350000000),
)
MODE_DIR_MTIME = 1300000000


def make_tar_modes_gz():
    """A tiny tar.gz whose members carry DISTINCTIVE modes and mtimes."""
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w") as t:
        d = tarfile.TarInfo("m")
        d.type = tarfile.DIRTYPE
        d.mode = 0o700
        d.mtime = MODE_DIR_MTIME
        t.addfile(d)
        for name, data, mode, mtime in MODE_MEMBERS:
            info = tarfile.TarInfo(name)
            info.size = len(data)
            info.mode = mode
            info.mtime = mtime
            t.addfile(info, io.BytesIO(data))
    return gzip.compress(buf.getvalue(), mtime=0)


def make_zip_modes():
    """The same shape as a zip, to pin that extraction restores NOTHING.

    CPython's zipfile writes a mode into external_attr and a timestamp into
    the DOS date/time, and its extract() then ignores both.  The fixture
    asserts that Grail ignores them too -- which is conformance, not a gap.
    """
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        for name, data, mode, _mtime in MODE_MEMBERS:
            info = zipfile.ZipInfo(name, date_time=FIXED_DATE_TIME)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (mode & 0o7777) << 16
            z.writestr(info, data)
    return buf.getvalue()


def make_zip64():
    """A minimal but genuine ZIP64 archive.

    CPython only emits the ZIP64 end-of-central-directory record when a
    count or offset actually saturates -- which needs either 65536+ entries
    or four gigabytes of data, neither of which belongs in a checked-in
    fixture.  So this assembles the same structures by hand, with the
    32-bit EOCD fields set to their 0xFFFF/0xFFFFFFFF sentinels so a reader
    MUST follow the locator to the ZIP64 record to find the central
    directory.  verify() then confirms CPython's own zipfile reads it, which
    is what makes it evidence rather than something we merely believe.
    """
    name = b"z64.txt"
    payload = b"zip64 payload\n"
    crc = zipfile.crc32(payload) & 0xFFFFFFFF
    # local file header + data, stored (method 0)
    lfh = struct.pack("<IHHHHHIIIHH", 0x04034B50, 20, 0, 0, 0, 0,
                      crc, len(payload), len(payload), len(name), 0)
    local = lfh + name + payload
    cd_offset = len(local)
    # central directory entry
    cd = struct.pack("<IHHHHHHIIIHHHHHII", 0x02014B50, 20, 20, 0, 0, 0, 0,
                     crc, len(payload), len(payload), len(name), 0, 0, 0, 0,
                     0, 0) + name
    cd_size = len(cd)
    eocd64_offset = cd_offset + cd_size
    # zip64 end of central directory record (56 bytes total)
    eocd64 = struct.pack("<IQHHIIQQQQ", 0x06064B50, 44, 45, 45, 0, 0,
                         1, 1, cd_size, cd_offset)
    # zip64 end of central directory locator
    loc = struct.pack("<IIQI", 0x07064B50, 0, eocd64_offset, 1)
    # classic EOCD with every field saturated, forcing the zip64 path
    eocd = struct.pack("<IHHHHIIH", 0x06054B50, 0xFFFF, 0xFFFF, 0xFFFF,
                       0xFFFF, 0xFFFFFFFF, 0xFFFFFFFF, 0)
    return local + cd + eocd64 + loc + eocd


def verify():
    """Read every fixture back with CPython and check the contents."""
    ok = True

    data = make_zip()
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        checks = [
            (z.namelist() == ["hello.txt", "empty.txt", "stored.bin",
                              "big.txt", "sub/nested.txt"], "zip namelist"),
            (z.read("hello.txt") == b"hello world\n", "zip hello"),
            (z.read("empty.txt") == b"", "zip empty"),
            (z.read("stored.bin") == STORED, "zip stored"),
            (z.getinfo("stored.bin").compress_type == 0, "zip stored method"),
            (z.getinfo("big.txt").compress_type == 8, "zip big method"),
            (z.read("big.txt") == BIG, "zip big"),
            (z.read("sub/nested.txt") == NESTED, "zip nested"),
        ]
    for good, label in checks:
        print("%-4s %s" % ("OK" if good else "FAIL", label))
        ok = ok and good

    raw = make_tar_gz()
    with tarfile.open(fileobj=io.BytesIO(raw), mode="r:gz") as t:
        names = t.getnames()
        checks = [
            (names == ["src", "src/hello.txt", "src/empty.txt", "src/big.bin",
                       "src/sub", "src/sub/nested.txt"], "tar names"),
            (t.extractfile("src/hello.txt").read() == b"hello tar\n", "tar hello"),
            (t.extractfile("src/empty.txt").read() == b"", "tar empty"),
            (t.extractfile("src/big.bin").read() == BIG, "tar big"),
            (t.extractfile("src/sub/nested.txt").read() == NESTED, "tar nested"),
            (t.getmember("src/sub").isdir(), "tar isdir"),
        ]
    for good, label in checks:
        print("%-4s %s" % ("OK" if good else "FAIL", label))
        ok = ok and good

    for fmt, label, marker in ((tarfile.PAX_FORMAT, "pax", b"@PaxHeader"),
                               (tarfile.GNU_FORMAT, "gnu", None)):
        raw = make_tar_meta_gz(fmt)
        plain = zlib.decompress(raw, 47)
        with tarfile.open(fileobj=io.BytesIO(raw)) as t:
            names = t.getnames()
            checks = [
                (names == [LONGNAME, "src/plain.txt"], label + " names"),
                (t.extractfile(LONGNAME).read() == b"deep payload\n",
                 label + " deep content"),
                (t.extractfile("src/plain.txt").read() == b"plain\n",
                 label + " plain content"),
            ]
        if marker is not None:
            checks.append((plain.find(marker) >= 0, label + " metadata member"))
        else:
            has_L = any(plain[i * 512 + 156:i * 512 + 157] == b"L"
                        for i in range(len(plain) // 512))
            checks.append((has_L, label + " longname member"))
        for good, lbl in checks:
            print("%-4s %s" % ("OK" if good else "FAIL", lbl))
            ok = ok and good

    raw = make_tar_modes_gz()
    with tarfile.open(fileobj=io.BytesIO(raw), mode="r:gz") as t:
        checks = [(t.getmember("m").isdir(), "modes tar dir"),
                  (t.getmember("m").mtime == MODE_DIR_MTIME, "modes tar dir mtime")]
        for name, data, mode, mtime in MODE_MEMBERS:
            m = t.getmember(name)
            checks.append((m.mode == mode, "modes tar %s mode" % name))
            checks.append((m.mtime == mtime, "modes tar %s mtime" % name))
            checks.append((t.extractfile(name).read() == data,
                           "modes tar %s content" % name))
    for good, label in checks:
        print("%-4s %s" % ("OK" if good else "FAIL", label))
        ok = ok and good

    raw = make_zip_modes()
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        checks = []
        for name, data, mode, _mtime in MODE_MEMBERS:
            i = z.getinfo(name)
            checks.append(((i.external_attr >> 16) == (mode & 0o7777),
                           "modes zip %s attr" % name))
            checks.append((i.date_time == FIXED_DATE_TIME,
                           "modes zip %s date_time" % name))
            checks.append((z.read(name) == data, "modes zip %s content" % name))
    for good, label in checks:
        print("%-4s %s" % ("OK" if good else "FAIL", label))
        ok = ok and good

    z64 = make_zip64()
    with zipfile.ZipFile(io.BytesIO(z64)) as z:
        checks = [
            (z.namelist() == ["z64.txt"], "zip64 namelist"),
            (z.read("z64.txt") == b"zip64 payload\n", "zip64 content"),
        ]
    # The point of the fixture: the plain EOCD is saturated, so a reader that
    # ignores the ZIP64 locator cannot find the central directory at all.
    checks.append((z64[-22:-2].count(b"\xff") >= 12, "zip64 eocd saturated"))
    checks.append((z64.find(b"PK\x06\x06") >= 0, "zip64 record present"))
    checks.append((z64.find(b"PK\x06\x07") >= 0, "zip64 locator present"))
    for good, label in checks:
        print("%-4s %s" % ("OK" if good else "FAIL", label))
        ok = ok and good
    return ok


def wrap(label, data, width=96):
    """Print the hex as Python string literals ready to paste into a test."""
    h = data.hex()
    print("\n# %s -- %d bytes" % (label, len(data)))
    for i in range(0, len(h), width):
        print('    "%s"' % h[i:i + width])


GS_FILES = ("src/smalltalk/PythonTests/ZipfileTestCase.gs",
            "src/smalltalk/PythonTests/TarfileTestCase.gs")

# The metadata archives live in ONE file, the self-running fixture, rather than
# in both .gs test files -- so they are listed separately from the five above,
# which every .gs file must carry byte-identical copies of.
EXTRA_FILES = (("tests/python/archive_metadata.py",
                ("_TARMODEHEX", "_ZIPMODEHEX")),)


def check_embedded():
    """Confirm the hex embedded in the SUnit tests is what this script makes.

    The fixtures live as hex literals inside the .gs test files, so nothing
    would otherwise stop a hand-edit from drifting away from the archives
    CPython actually produces -- and a fixture edited by hand to make a test
    pass is exactly the failure mode the CPython-produced fixtures exist to
    rule out.  Both test files must carry byte-identical copies.
    """
    import os
    wanted = {
        "_ZIPHEX": make_zip().hex(),
        "_TGZHEX": make_tar_gz().hex(),
        "_PAXHEX": make_tar_meta_gz(tarfile.PAX_FORMAT).hex(),
        "_GNUHEX": make_tar_meta_gz(tarfile.GNU_FORMAT).hex(),
        "_Z64HEX": make_zip64().hex(),
    }
    extra = {
        "_TARMODEHEX": make_tar_modes_gz().hex(),
        "_ZIPMODEHEX": make_zip_modes().hex(),
    }
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    ok = True
    for rel, names in EXTRA_FILES:
        path = os.path.join(root, rel)
        if not os.path.exists(path):
            print("FAIL missing %s" % rel)
            ok = False
            continue
        text = open(path).read()
        for var in names:
            i = text.find(var + " = (")
            if i < 0:
                print("FAIL %s: no %s" % (rel, var))
                ok = False
                continue
            end = text.index(")", i)
            got = "".join(part for part in text[i:end].split('"')[1::2])
            good = (got == extra[var])
            print("%-4s %s %s embedded hex" % ("OK" if good else "FAIL",
                                               os.path.basename(rel), var))
            ok = ok and good
    for rel in GS_FILES:
        path = os.path.join(root, rel)
        if not os.path.exists(path):
            print("FAIL missing %s" % rel)
            ok = False
            continue
        text = open(path).read()
        for var, expect in wanted.items():
            i = text.find(var + " = (")
            if i < 0:
                print("FAIL %s: no %s" % (rel, var))
                ok = False
                continue
            end = text.index(")", i)
            got = "".join(part for part in text[i:end].split('"')[1::2])
            good = (got == expect)
            print("%-4s %s %s embedded hex" % ("OK" if good else "FAIL",
                                               os.path.basename(rel), var))
            ok = ok and good
    return ok


def main():
    ok = verify()
    ok = check_embedded() and ok
    if not ok:
        print("FIXTURE VERIFICATION FAILED", file=sys.stderr)
        return 1
    if "--check" not in sys.argv:
        wrap("modes.tar.gz -- _TARMODEHEX", make_tar_modes_gz())
        wrap("modes.zip -- _ZIPMODEHEX", make_zip_modes())
        wrap("sample.zip", make_zip())
        wrap("sample.tar.gz", make_tar_gz())
        wrap("pax.tar.gz", make_tar_meta_gz(tarfile.PAX_FORMAT))
        wrap("gnu.tar.gz", make_tar_meta_gz(tarfile.GNU_FORMAT))
        wrap("zip64.zip", make_zip64())
    return 0


if __name__ == "__main__":
    sys.exit(main())
