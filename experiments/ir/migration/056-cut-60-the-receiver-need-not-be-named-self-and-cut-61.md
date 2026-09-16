## Progress — cut 60 (the receiver need not be named `self`) and cut 61 (`@classmethod`)

Two of item 1c's three leftovers.

**Cut 60.** `method:selfNotNamedSelf` (64 stdlib methods -- `abc.ABCMeta`'s
`cls`, `_pyio`'s `this`, `__new__(cls, ...)`) refused a method whose first
parameter had any other name.  The text never cared: ClassDefAst switches
`selfParameterName` to each def's FIRST parameter before generating its
source, `isSelfReference:` maps every read of that name to Smalltalk `self`,
and the seam's compile-context snapshot carries the same name to the deferred
build.  The predicate now asks only that the two agree (`method:
receiverNameMismatch` -- a def with no plain positional parameter keeps the
class-wide name, which is not its receiver), the rebinding check names the
receiver rather than `self`, and `NameAst>>___irIsSelfReceiver___` drops its
`== #self` test; every self-receiver emit (attribute loads and stores, self-
sends, the annotated store) already went through that one predicate.

**Cut 61.** `method:classmethod` (42).  The parser re-classes a
`@classmethod` def as ClassFunctionDefAst; the text builds it from the SAME
per-method generator with `cls` as the receiver and installs it on the
metaclass (`<cls> @env0:class ___compileMethod:`), so the IR method is the
same method built onto `<cls> class` -- `cls(...)` is `self value:value:`,
`cls.n` the dynamic-instVar-first load, on the class object.  The classmethod
loop now judges and registers like the instance loop (key `class>>` +
selector, so a class-side and an instance-side method of one selector cannot
collide in the per-class map), the class-side emission loop emits
`___irInstallDef:on: <cls> @env0:class or:`, and the install seam needed no
change.  `@staticmethod` (19) stays on text: its source is the MODULE form
(no receiver strip, `selfParameterName` nil), so it wants the module-mode
prologue built onto the metaclass -- a separate cut.

Defect found: the first flag-on probe compiled 289 of 292 -- the three
classmethods were judged eligible (`cm:eligible` 77) and registered, yet the
text compiled and nothing counted a miss.  `___irForgetClassDefIds___:` ran
right after the INSTANCE emission loop, dropping the still-unconsumed
`class>>` registrations before the classmethod loop could read them; it now
runs after that loop.  A registration the emission never consumes is a
silent text fallback, invisible to `fallbacks` -- the tripwire is the only
instrument that sees it.

Second defect, from the flag-on sweep (12 new errors: six
SubclassAttrShadowTestCase, four Django, MixinMethodMetadata, an inspect
landmine): `NameError: method compile failed []: CompileError unexpected
token` -- the signature of a Smalltalk recompile handed an IR method's
PYTHON source, this time on the class side.  `___mergeSecondaryBases___:`'s
class-side pass copied a metaclass method as `walker class sourceCodeAt:`
into `aClass class ___compileMethod:`; for an IR-built @classmethod that is
its Python.  The pass now goes through `___copyMethod___:from:to:category:`
like the instance pass, `___textSourceFor___:in:selector:` accepts a
METACLASS provider (looks the class's table up under `class>>` + selector),
and the class-side emission loop notes its text twins under that key -- so
the `___irTextSources___` table and the registration-map release both move
past the classmethod loop (still before the merge statement).  The pattern
is the one memory already records for the instance side (#836's shadow
sites, the MI merge): every consumer that recompiles a method's source must
go through the copier, and a new install target (here the metaclass) has to
be walked for such consumers before it is switched on.

Fixtures: Rect (receivers `this`, `me`, `rect`, `self_`, `s`; an augmented
attribute store rewritten as a plain one, since `AugAssignAst:target-
AttributeAst` is still refused); Maker / SubMaker (`cls(v)`, `cls.n`,
`cls.__name__`, a keyword default, inherited classmethods answering the
subclass, an instance-side self-send to a classmethod).  Compiled 280 -> 286
-> 292, 0 fallbacks, RESULTS true with the flag on and off.  Gates (after both fixes): flag-off
`6431 run, 6431 passed, 0 failed, 0 errors`; flag-on cold sweep `6431 run,
6421 passed, 8 failed, 2 errors` -- the known nine plus `[ERROR]
WarningRegistryTestCase>>testAnUnknownCallSiteDoesNotDedupe`, whose shard log
reads `AlmostOutOfMemory ... Session's temporary object memory is almost
full` and which passes alone flag-on (11/11): the recorded cold-shard
memory-pressure follow-up (importlib's `on: AbstractException` unloading a
module on a Notification), not a cut defect.  The 63 SUnit classes that
mention classmethods or non-`self` receivers, run flag-on in one session:
only the known FrameReceiverSuggestion failure.
