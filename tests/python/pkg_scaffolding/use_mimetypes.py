import mimetypes


def guess_html():
    return mimetypes.guess_type("index.html")


def guess_png():
    return mimetypes.guess_type("img/header.png")


def guess_with_encoding():
    return mimetypes.guess_type("archive.tar.gz")


def guess_unknown():
    return mimetypes.guess_type("data.qqq")


def guess_extensionless():
    return mimetypes.guess_type("README")


def guess_through_query():
    return mimetypes.guess_type("/static/app.css?v=12")


def guess_ext_of_jpeg():
    return mimetypes.guess_extension("image/jpeg")


def add_custom_then_guess():
    mimetypes.add_type("application/x-grail", ".grail")
    return mimetypes.guess_type("test.grail")


def inited_after_import():
    return mimetypes.inited
