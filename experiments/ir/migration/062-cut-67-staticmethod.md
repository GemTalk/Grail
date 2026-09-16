## Progress — cut 67 (`@staticmethod`)

The last of item 1c's receiver shapes (`method:staticmethod`, 19 stdlib
methods).  The text builds a @staticmethod from the MODULE generator
(generateModuleMethodSourceOn:) under the class context -- every parameter a
Smalltalk argument, the module selector, `selfParameterName` nil so no name
maps to the receiver, module names through the module instance -- and
installs it on the metaclass.  One predicate carries the difference:
`___irStripsReceiver___` (method mode AND not a StaticFunctionDefAst) now
decides the selector, the parameter list, the varargs form and the default
owner where `___irMethodMode___` used to; the static loop in ClassDefAst
registers and installs class-side exactly as the classmethod loop does
(`class>>` key, text twin noted, the table and the map release moved after
the LAST method loop).

One shape had to be read rather than guessed: a @staticmethod's parameter
DEFAULT.  The text's module-form generator, run in a class context, emits no
memo at all -- neither the module `___moduleDefaultAt:compute:` (which the
first probe sent to the CLASS: `a Util class does not understand`) nor the
class table -- the default expression is simply evaluated inline on every
call that needs it.  That is the third of the three default paths the
``defaults are recreated per call'' note already records; the IR mirrors it
rather than fixing it, because the two paths must agree.

Fixture: Util (fixed-arity, a default reading a module global, `*args /
**kw`, called on the class, on an instance, from an instance method, and with
a splat).  Compiled 353 -> 358, 0 fallbacks, RESULTS true with the flag on
and off.  Gates: flag-off `6431 run, 6431 passed, 0 failed, 0 errors`;
flag-on cold sweep `6431 run, 6421 passed, 8 failed, 2 errors` -- the known
nine plus `[ERROR] TwilioClientTestCase>>testMessagesCreate`, AlmostOutOfMemory
in its shard log (15 notifications in this sweep, the most yet; 6/6 alone
flag-on).  The cold-shard memory pressure is now the one thing every sweep
reports, and it is growing with coverage.
