# GRAIL argparse - the commonly used core: ArgumentParser with
# add_argument (store / store_true / store_false / store_const /
# append / count / help actions; nargs N / '?' / '*' / '+'; type=,
# default=, choices=, required=, dest=), parse_args onto a Namespace,
# and minimal usage/help text.  Deviations from CPython, kept
# deliberately small for V1:
#   * no subparsers, argument groups, mutually exclusive groups,
#     prefix abbreviation, or fromfile arguments;
#   * parse_args(None) uses sys.argv[1:] when available, else [];
#   * error paths print the message and raise SystemExit (no stderr
#     distinction).

import sys

__all__ = ["ArgumentParser", "Namespace", "ArgumentError", "SUPPRESS"]

SUPPRESS = "==SUPPRESS=="


class ArgumentError(Exception):
    pass


class Namespace:
    def __init__(self):
        self._attr_names = []

    def _record(self, name):
        if name not in self._attr_names:
            self._attr_names.append(name)

    def __repr__(self):
        parts = []
        for name in self._attr_names:
            parts.append(name + "=" + repr(getattr(self, name)))
        return "Namespace(" + ", ".join(parts) + ")"

    def __contains__(self, name):
        return name in self._attr_names


class _Action:
    def __init__(self, option_strings, dest, action, nargs, const,
                 default, type_fn, choices, required, help_text, metavar):
        self.option_strings = option_strings
        self.dest = dest
        self.action = action
        self.nargs = nargs
        self.const = const
        self.default = default
        self.type_fn = type_fn
        self.choices = choices
        self.required = required
        self.help_text = help_text
        self.metavar = metavar

    def is_positional(self):
        return len(self.option_strings) == 0

    def display_name(self):
        if self.is_positional():
            return self.dest
        return self.option_strings[0]

    def min_count(self):
        """Minimum number of values a positional consumes."""
        if self.nargs is None:
            return 1
        if self.nargs == "?" or self.nargs == "*":
            return 0
        if self.nargs == "+":
            return 1
        return self.nargs


class ArgumentParser:
    def __init__(self, prog=None, description=None, epilog=None,
                 add_help=True):
        if prog is None:
            prog = "prog"
        self.prog = prog
        self.description = description
        self.epilog = epilog
        self._actions = []
        self._option_map = {}
        self._extra_defaults = {}
        if add_help:
            self.add_argument("-h", "--help", action="help",
                              help="show this help message and exit")

    # -- declaration --

    def add_argument(self, *names, action="store", nargs=None, const=None,
                     default=None, type=None, choices=None, required=False,
                     help=None, dest=None, metavar=None):
        option_strings = []
        positional_name = None
        for name in names:
            if name.startswith("-"):
                option_strings.append(name)
            else:
                positional_name = name
        if positional_name is not None and option_strings:
            raise ValueError("argument names must be all optional "
                             "or all positional")
        if dest is None:
            if positional_name is not None:
                dest = positional_name
            else:
                # Prefer the first long option; fall back to the first.
                base = None
                for name in option_strings:
                    if name.startswith("--"):
                        base = name[2:]
                        break
                if base is None:
                    base = option_strings[0].lstrip("-")
                dest = base.replace("-", "_")
        if action == "store_true":
            if default is None:
                default = False
            const = True
        elif action == "store_false":
            if default is None:
                default = True
            const = False
        elif action == "count":
            if default is None:
                default = 0
        spec = _Action(option_strings, dest, action, nargs, const, default,
                       type, choices, required, help, metavar)
        self._actions.append(spec)
        for name in option_strings:
            self._option_map[name] = spec
        return spec

    def set_defaults(self, **kw):
        for key in kw:
            self._extra_defaults[key] = kw[key]

    # -- errors / help --

    def format_usage(self):
        parts = ["usage:", self.prog]
        for spec in self._actions:
            if spec.is_positional():
                parts.append(spec.dest)
            elif spec.required:
                parts.append(spec.option_strings[0])
            else:
                parts.append("[" + spec.option_strings[0] + "]")
        return " ".join(parts)

    def format_help(self):
        lines = [self.format_usage()]
        if self.description is not None:
            lines.append("")
            lines.append(self.description)
        lines.append("")
        lines.append("options:")
        for spec in self._actions:
            if spec.help_text == SUPPRESS:
                continue
            label = ", ".join(spec.option_strings)
            if spec.is_positional():
                label = spec.dest
            entry = "  " + label
            if spec.help_text is not None:
                entry = entry + "  " + spec.help_text
            lines.append(entry)
        if self.epilog is not None:
            lines.append("")
            lines.append(self.epilog)
        return "\n".join(lines)

    def print_help(self):
        print(self.format_help())

    def error(self, message):
        print(self.format_usage())
        print(self.prog + ": error: " + message)
        raise SystemExit(2)

    # -- parsing --

    def _convert(self, spec, raw):
        value = raw
        if spec.type_fn is not None:
            try:
                value = spec.type_fn(raw)
            except ValueError:
                self.error("argument " + spec.display_name()
                           + ": invalid value: " + repr(raw))
        if spec.choices is not None and value not in spec.choices:
            self.error("argument " + spec.display_name()
                       + ": invalid choice: " + repr(value))
        return value

    def _set(self, namespace, spec, value):
        setattr(namespace, spec.dest, value)
        namespace._record(spec.dest)

    def _consume_values(self, spec, argv, i):
        """Consume option values for spec starting at argv[i].
        Returns (value, next_index)."""
        nargs = spec.nargs
        if nargs is None:
            if i >= len(argv):
                self.error("argument " + spec.display_name()
                           + ": expected one argument")
            return self._convert(spec, argv[i]), i + 1
        if nargs == "?":
            if i < len(argv) and not argv[i].startswith("-"):
                return self._convert(spec, argv[i]), i + 1
            return spec.const, i
        if nargs == "*" or nargs == "+":
            values = []
            while i < len(argv) and not argv[i].startswith("-"):
                values.append(self._convert(spec, argv[i]))
                i = i + 1
            if nargs == "+" and len(values) == 0:
                self.error("argument " + spec.display_name()
                           + ": expected at least one argument")
            return values, i
        # integer nargs
        values = []
        count = 0
        while count < nargs:
            if i >= len(argv):
                self.error("argument " + spec.display_name() + ": expected "
                           + str(nargs) + " arguments")
            values.append(self._convert(spec, argv[i]))
            i = i + 1
            count = count + 1
        return values, i

    def _apply_option(self, namespace, spec, argv, i, inline_value):
        action = spec.action
        if action == "help":
            self.print_help()
            raise SystemExit(0)
        if action == "store_true" or action == "store_false" or action == "store_const":
            if inline_value is not None:
                self.error("argument " + spec.display_name()
                           + ": ignored explicit argument")
            self._set(namespace, spec, spec.const)
            return i
        if action == "count":
            current = getattr(namespace, spec.dest)
            self._set(namespace, spec, current + 1)
            return i
        if inline_value is not None:
            value = self._convert(spec, inline_value)
        else:
            value, i = self._consume_values(spec, argv, i)
        if action == "append":
            current = getattr(namespace, spec.dest)
            if current is None:
                current = []
                self._set(namespace, spec, current)
            current.append(value)
        else:
            self._set(namespace, spec, value)
        return i

    def parse_args(self, args=None, namespace=None):
        if args is None:
            argv_all = getattr(sys, "argv", None)
            if argv_all is None:
                args = []
            else:
                args = argv_all[1:]
        argv = list(args)
        if namespace is None:
            namespace = Namespace()
        seen = []
        # Defaults first.
        for spec in self._actions:
            if spec.action == "help" or spec.default == SUPPRESS:
                continue
            self._set(namespace, spec, spec.default)
        for key in self._extra_defaults:
            setattr(namespace, key, self._extra_defaults[key])
            namespace._record(key)
        positional_queue = []
        i = 0
        n = len(argv)
        explicit_positional_only = False
        while i < n:
            token = argv[i]
            if token == "--" and not explicit_positional_only:
                explicit_positional_only = True
                i = i + 1
                continue
            if (not explicit_positional_only) and token.startswith("--"):
                eq = token.find("=")
                inline_value = None
                name = token
                if eq >= 0:
                    name = token[:eq]
                    inline_value = token[eq + 1:]
                spec = self._option_map.get(name)
                if spec is None:
                    self.error("unrecognized arguments: " + name)
                seen.append(spec.dest)
                i = self._apply_option(namespace, spec, argv, i + 1,
                                       inline_value)
                continue
            if (not explicit_positional_only) and token.startswith("-") and token != "-":
                # Short option(s): -v, -ovalue, -vvv cluster of flags.
                rest = token[1:]
                while rest != "":
                    name = "-" + rest[0]
                    rest = rest[1:]
                    spec = self._option_map.get(name)
                    if spec is None:
                        self.error("unrecognized arguments: " + name)
                    seen.append(spec.dest)
                    takes_value = (spec.action == "store"
                                   or spec.action == "append")
                    if takes_value and rest != "":
                        i = self._apply_option(namespace, spec, argv, i + 1,
                                               rest)
                        rest = ""
                    elif takes_value:
                        i = self._apply_option(namespace, spec, argv, i + 1,
                                               None) - 1
                        rest = ""
                    else:
                        self._apply_option(namespace, spec, argv, i + 1, None)
                i = i + 1
                continue
            positional_queue.append(token)
            i = i + 1
        self._match_positionals(namespace, positional_queue, seen)
        # Required options.
        for spec in self._actions:
            if (not spec.is_positional()) and spec.required and spec.dest not in seen:
                self.error("the following arguments are required: "
                           + spec.display_name())
        return namespace

    def _match_positionals(self, namespace, queue, seen):
        positionals = []
        for spec in self._actions:
            if spec.is_positional():
                positionals.append(spec)
        qi = 0
        total = len(queue)
        index = 0
        count_pos = len(positionals)
        while index < count_pos:
            spec = positionals[index]
            remaining_min = 0
            j = index + 1
            while j < count_pos:
                remaining_min = remaining_min + positionals[j].min_count()
                j = j + 1
            available = total - qi - remaining_min
            nargs = spec.nargs
            if nargs is None:
                if available < 1:
                    self.error("the following arguments are required: "
                               + spec.dest)
                self._set(namespace, spec, self._convert(spec, queue[qi]))
                qi = qi + 1
            elif nargs == "?":
                if available >= 1:
                    self._set(namespace, spec, self._convert(spec, queue[qi]))
                    qi = qi + 1
                else:
                    self._set(namespace, spec, spec.default)
            elif nargs == "*" or nargs == "+":
                take = available
                if take < 0:
                    take = 0
                values = []
                k = 0
                while k < take:
                    values.append(self._convert(spec, queue[qi]))
                    qi = qi + 1
                    k = k + 1
                if nargs == "+" and len(values) == 0:
                    self.error("the following arguments are required: "
                               + spec.dest)
                self._set(namespace, spec, values)
            else:
                if available < nargs:
                    self.error("argument " + spec.dest + ": expected "
                               + str(nargs) + " arguments")
                values = []
                k = 0
                while k < nargs:
                    values.append(self._convert(spec, queue[qi]))
                    qi = qi + 1
                    k = k + 1
                self._set(namespace, spec, values)
            seen.append(spec.dest)
            index = index + 1
        if qi < total:
            self.error("unrecognized arguments: " + " ".join(queue[qi:]))
