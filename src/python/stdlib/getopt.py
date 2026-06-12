# GRAIL getopt - C-style command-line option parser, same algorithm as
# CPython's pure-Python getopt.  gnu_getopt is provided without the
# POSIXLY_CORRECT environment check.

__all__ = ["GetoptError", "error", "getopt", "gnu_getopt"]


class GetoptError(Exception):
    def __init__(self, msg, opt=""):
        super().__init__(msg)
        self.msg = msg
        self.opt = opt


error = GetoptError


def getopt(args, shortopts, longopts=None):
    """Parse command-line options: returns (opts, remaining_args)."""
    opts = []
    if longopts is None:
        longopts = []
    if isinstance(longopts, str):
        longopts = [longopts]
    else:
        longopts = list(longopts)
    args = list(args)
    while args and args[0].startswith("-") and args[0] != "-":
        if args[0] == "--":
            args = args[1:]
            break
        if args[0].startswith("--"):
            opts, args = do_longs(opts, args[0][2:], longopts, args[1:])
        else:
            opts, args = do_shorts(opts, args[0][1:], shortopts, args[1:])
    return opts, args


def gnu_getopt(args, shortopts, longopts=None):
    """Like getopt(), but intersperses options and non-option args."""
    opts = []
    prog_args = []
    if longopts is None:
        longopts = []
    if isinstance(longopts, str):
        longopts = [longopts]
    else:
        longopts = list(longopts)
    args = list(args)
    while args:
        if args[0] == "--":
            prog_args = prog_args + args[1:]
            break
        if args[0].startswith("--"):
            opts, args = do_longs(opts, args[0][2:], longopts, args[1:])
        elif args[0].startswith("-") and args[0] != "-":
            opts, args = do_shorts(opts, args[0][1:], shortopts, args[1:])
        else:
            prog_args.append(args[0])
            args = args[1:]
    return opts, prog_args


def do_longs(opts, opt, longopts, args):
    i = opt.find("=")
    if i >= 0:
        optarg = opt[i + 1:]
        opt = opt[:i]
    else:
        optarg = None
    has_arg, opt = long_has_args(opt, longopts)
    if has_arg:
        if optarg is None:
            if not args:
                raise GetoptError("option --" + opt + " requires argument", opt)
            optarg = args[0]
            args = args[1:]
    elif optarg is not None:
        raise GetoptError("option --" + opt + " must not have an argument", opt)
    if optarg is None:
        optarg = ""
    opts.append(("--" + opt, optarg))
    return opts, args


def long_has_args(opt, longopts):
    possibilities = []
    for o in longopts:
        if o == opt or o == opt + "=":
            possibilities.append(o)
        elif o.startswith(opt):
            possibilities.append(o)
    if not possibilities:
        raise GetoptError("option --" + opt + " not recognized", opt)
    # Exact match preferred.
    if opt in possibilities:
        return False, opt
    if opt + "=" in possibilities:
        return True, opt
    if len(possibilities) > 1:
        raise GetoptError("option --" + opt + " not a unique prefix", opt)
    unique_match = possibilities[0]
    has_arg = unique_match.endswith("=")
    if has_arg:
        unique_match = unique_match[:-1]
    return has_arg, unique_match


def do_shorts(opts, optstring, shortopts, args):
    while optstring != "":
        opt = optstring[0]
        optstring = optstring[1:]
        if short_has_arg(opt, shortopts):
            if optstring == "":
                if not args:
                    raise GetoptError("option -" + opt + " requires argument", opt)
                optstring = args[0]
                args = args[1:]
            optarg = optstring
            optstring = ""
        else:
            optarg = ""
        opts.append(("-" + opt, optarg))
    return opts, args


def short_has_arg(opt, shortopts):
    i = 0
    n = len(shortopts)
    while i < n:
        if opt == shortopts[i] and opt != ":":
            return i + 1 < n and shortopts[i + 1] == ":"
        i = i + 1
    raise GetoptError("option -" + opt + " not recognized", opt)
