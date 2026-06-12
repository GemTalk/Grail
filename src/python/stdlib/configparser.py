# GRAIL configparser - INI-style configuration files: sections,
# key = value / key : value options, [DEFAULT] fallthrough, full-line
# and inline-free comments, indentation-based continuations, basic
# %(name)s interpolation, getint/getfloat/getboolean, mapping-style
# section access, and write().  Deviations from CPython, kept
# deliberately small for V1:
#   * ExtendedInterpolation ($-syntax) is not provided;
#   * allow_no_value / delimiters / comment_prefixes are fixed at the
#     defaults;
#   * RawConfigParser is ConfigParser with interpolation=None.

__all__ = ["Error", "NoSectionError", "NoOptionError",
           "DuplicateSectionError", "MissingSectionHeaderError",
           "InterpolationError", "ConfigParser", "RawConfigParser",
           "DEFAULTSECT"]

DEFAULTSECT = "DEFAULT"

_BOOLEAN_STATES = {"1": True, "yes": True, "true": True, "on": True,
                   "0": False, "no": False, "false": False, "off": False}

_UNSET = ["unset-sentinel"]


class Error(Exception):
    pass


class NoSectionError(Error):
    pass


class NoOptionError(Error):
    pass


class DuplicateSectionError(Error):
    pass


class MissingSectionHeaderError(Error):
    pass


class InterpolationError(Error):
    pass


class SectionProxy:
    def __init__(self, parser, name):
        self._parser = parser
        self._name = name

    def __getitem__(self, key):
        return self._parser.get(self._name, key)

    def __setitem__(self, key, value):
        self._parser.set(self._name, key, value)

    def __contains__(self, key):
        return self._parser.has_option(self._name, key)

    def get(self, key, fallback=None):
        if self._parser.has_option(self._name, key):
            return self._parser.get(self._name, key)
        return fallback

    def keys(self):
        return self._parser.options(self._name)


class ConfigParser:
    def __init__(self, defaults=None, interpolation=_UNSET):
        self._defaults = {}
        self._sections = {}
        self._section_order = []
        if interpolation is _UNSET:
            self._interpolate = True
        else:
            self._interpolate = interpolation is not None
        if defaults is not None:
            for key in defaults:
                self._defaults[self.optionxform(key)] = str(defaults[key])

    def optionxform(self, optionstr):
        return optionstr.lower()

    def defaults(self):
        return self._defaults

    def sections(self):
        return list(self._section_order)

    def has_section(self, section):
        return section in self._sections

    def add_section(self, section):
        if section == DEFAULTSECT:
            raise ValueError("Invalid section name: " + section)
        if section in self._sections:
            raise DuplicateSectionError("Section " + section + " already exists")
        self._sections[section] = {}
        self._section_order.append(section)

    def options(self, section):
        opts = self._section_map(section)
        out = []
        for key in opts:
            out.append(key)
        for key in self._defaults:
            if key not in out:
                out.append(key)
        return out

    def has_option(self, section, option):
        if section != DEFAULTSECT and section not in self._sections:
            return False
        option = self.optionxform(option)
        if option in self._defaults:
            return True
        if section == DEFAULTSECT:
            return False
        return option in self._sections[section]

    def _section_map(self, section):
        if section == DEFAULTSECT:
            return self._defaults
        if section not in self._sections:
            raise NoSectionError("No section: " + section)
        return self._sections[section]

    def get(self, section, option, fallback=_UNSET, raw=False):
        opts = None
        if section == DEFAULTSECT or section in self._sections:
            opts = self._section_map(section)
        else:
            if fallback is _UNSET:
                raise NoSectionError("No section: " + section)
            return fallback
        option = self.optionxform(option)
        if option in opts:
            value = opts[option]
        elif option in self._defaults:
            value = self._defaults[option]
        else:
            if fallback is _UNSET:
                raise NoOptionError("No option " + option + " in section: " + section)
            return fallback
        if raw or not self._interpolate:
            return value
        return self._expand(section, value, 0)

    def _expand(self, section, value, depth):
        if depth > 10:
            raise InterpolationError("interpolation too deep in " + value)
        if "%(" not in value:
            return value.replace("%%", "%")
        out = ""
        i = 0
        n = len(value)
        while i < n:
            ch = value[i]
            if ch == "%" and i + 1 < n:
                nxt = value[i + 1]
                if nxt == "%":
                    out = out + "%"
                    i = i + 2
                    continue
                if nxt == "(":
                    rest = value[i + 2:]
                    rel = rest.find(")s")
                    if rel < 0:
                        raise InterpolationError("bad interpolation syntax in " + value)
                    close = i + 2 + rel
                    name = value[i + 2:close]
                    ref = self.get(section, name, raw=True)
                    out = out + self._expand(section, ref, depth + 1)
                    i = close + 2
                    continue
            out = out + ch
            i = i + 1
        return out

    def set(self, section, option, value):
        opts = self._section_map(section)
        opts[self.optionxform(option)] = value

    def remove_option(self, section, option):
        opts = self._section_map(section)
        option = self.optionxform(option)
        if option in opts:
            del opts[option]
            return True
        return False

    def remove_section(self, section):
        if section in self._sections:
            del self._sections[section]
            self._section_order.remove(section)
            return True
        return False

    def getint(self, section, option, fallback=_UNSET):
        value = self.get(section, option, fallback)
        if value is fallback and fallback is not _UNSET:
            return fallback
        return int(value)

    def getfloat(self, section, option, fallback=_UNSET):
        value = self.get(section, option, fallback)
        if value is fallback and fallback is not _UNSET:
            return fallback
        return float(value)

    def getboolean(self, section, option, fallback=_UNSET):
        value = self.get(section, option, fallback)
        if value is fallback and fallback is not _UNSET:
            return fallback
        lowered = value.lower()
        if lowered not in _BOOLEAN_STATES:
            raise ValueError("Not a boolean: " + value)
        return _BOOLEAN_STATES[lowered]

    def items(self, section):
        out = []
        for key in self.options(section):
            out.append((key, self.get(section, key)))
        return out

    def __getitem__(self, section):
        if section != DEFAULTSECT and section not in self._sections:
            raise KeyError(section)
        return SectionProxy(self, section)

    def __contains__(self, section):
        return section == DEFAULTSECT or section in self._sections

    def read_string(self, string, source="<string>"):
        current = None
        current_option = None
        lineno = 0
        for raw_line in string.split("\n"):
            lineno = lineno + 1
            line = raw_line.rstrip()
            if line == "":
                current_option = None
                continue
            stripped = line.lstrip()
            first = stripped[0]
            if first == "#" or first == ";":
                continue
            indented = line[0] == " " or line[0] == "\t"
            if indented and current_option is not None and current is not None:
                # Continuation of the previous value.
                current[current_option] = current[current_option] + "\n" + stripped
                continue
            if first == "[":
                end = stripped.find("]")
                if end < 0:
                    raise Error("invalid section header at line " + str(lineno))
                name = stripped[1:end]
                if name == DEFAULTSECT:
                    current = self._defaults
                else:
                    if name not in self._sections:
                        self._sections[name] = {}
                        self._section_order.append(name)
                    current = self._sections[name]
                current_option = None
                continue
            if current is None:
                raise MissingSectionHeaderError(
                    "File contains no section headers: line " + str(lineno))
            eq = stripped.find("=")
            colon = stripped.find(":")
            if eq < 0 and colon < 0:
                raise Error("invalid line " + str(lineno) + ": " + stripped)
            if eq < 0 or (colon >= 0 and colon < eq):
                sep = colon
            else:
                sep = eq
            key = self.optionxform(stripped[:sep].strip())
            value = stripped[sep + 1:].strip()
            current[key] = value
            current_option = key
        return None

    def read_file(self, f, source=None):
        return self.read_string(f.read())

    def read(self, filenames, encoding=None):
        if isinstance(filenames, str):
            filenames = [filenames]
        read_ok = []
        for filename in filenames:
            try:
                f = open(filename, "r")
            except OSError:
                continue
            self.read_string(f.read())
            f.close()
            read_ok.append(filename)
        return read_ok

    def write(self, fp, space_around_delimiters=True):
        if space_around_delimiters:
            delim = " = "
        else:
            delim = "="
        if self._defaults:
            fp.write("[" + DEFAULTSECT + "]\n")
            for key in self._defaults:
                fp.write(key + delim + str(self._defaults[key]) + "\n")
            fp.write("\n")
        for section in self._section_order:
            fp.write("[" + section + "]\n")
            opts = self._sections[section]
            for key in opts:
                value = str(opts[key])
                fp.write(key + delim + value.replace("\n", "\n\t") + "\n")
            fp.write("\n")
        return None


class RawConfigParser(ConfigParser):
    def __init__(self, defaults=None):
        super().__init__(defaults, None)
