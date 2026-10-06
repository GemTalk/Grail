output pushnew runClassTransientTest.out
! file tests/scripts/runClassTransientTest.gs
!
! Class-level __transient__ (docs/App_Namespaces_Design.md §6.3): the instance
! attributes a class names in __transient__ are never committed.  They live in
! session storage keyed by the object, survive an abort, read as unset in a new
! session, and a committed object's __session_init__ rebuilds them on the first
! such read.
!
! Two sessions, so it cannot be SUnit.  Session 1 deploys a fixture module,
! commits an instance holding an open socket in a transient attribute, and
! checks the committed object holds no socket.  Session 2 reads it back.
! Leaves the repository clean.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! Session 1 -- deploy the fixture, commit an instance with a live socket.
! ===========================================================================
login
run
| dir |
dir := importlib grailDir.
dir ifNotNil: [
  (System gemEnvironmentVariable: 'GRAIL_DIR') = dir ifFalse: [
    System gemEnvironmentVariable: 'GRAIL_DIR' put: dir]]
%
level 0
run
| out evalPython failures check r tmpDir path file conn names stored |
out := GsFile stdout.
evalPython := [:src |
  | moduleScope scope module |
  moduleScope := SymbolDictionary new.
  scope := System myUserProfile symbolList copy.
  scope insertObject: moduleScope at: 1.
  module := ModuleAst parseSource: src.
  module useTempsForBlock: false.
  module ensureModuleScope: moduleScope.
  module evaluateWithScope: scope].
failures := OrderedCollection new.
check := [:label :ok |
  ok
    ifTrue: [out nextPutAll: '  PASS  ', label; cr]
    ifFalse: [failures add: label. out nextPutAll: '  FAIL  ', label; cr]].

tmpDir := importlib grailTmpDir.
path := tmpDir , '/grail_class_transient_fixture.py'.
(GsFile existsOnServer: path) == true ifTrue: [GsFile removeServerFile: path].
file := GsFile open: path mode: 'wb' onClient: false.
file nextPutAll: 'import socket


class Conn:
    __transient__ = ("_sock",)

    def __init__(self, address):
        self.address = address
        self._sock = socket.socket()

    def __session_init__(self):
        self.inits = getattr(self, "inits", 0) + 1
        self._sock = "rebuilt:" + self.address


class Pool(Conn):
    __transient__ = "_cache"


default = Conn("db0")


class Registry:
    __transient__ = ("_cache",)
    _cache = {}
    shared = {}


class SubRegistry(Registry):
    pass
'; close.
"SELF-HEAL: a run that died before its cleanup left these behind."
importlib ___forgetCanonicalModule___: 'grail_class_transient_fixture'.
evalPython value: '
import gemdb
gemdb.root.pop("class_transient_test", None)
'.
System commit.

evalPython value: 'import sys
if "' , tmpDir , '" not in sys.path:
    sys.path.append("' , tmpDir , '")
import grail_class_transient_fixture'.
"BEFORE the deploying commit, which is when the audit is meant to run: the
module global ``default'' holds a Conn whose socket is transient."
r := evalPython value: '
import gemstone
" | ".join(gemstone.deploy_check("grail_class_transient_fixture"))
'.
check value: 'deploy_check: a module global holding a transient socket is clean' value: r = ''.
System commit.

r := evalPython value: '
import gemdb, socket
from grail_class_transient_fixture import Conn, Pool
c = Conn("db1")
p = Pool("db2")
p._cache = {"k": 1}
gemdb.root["class_transient_test"] = {"conn": c, "pool": p}
gemdb.commit()
r = [isinstance(c._sock, socket.socket), sorted(vars(c)), sorted(vars(p)), gemdb.needs_commit()]
repr(r)
'.
check value: 'the committed instance keeps its socket for the session, and lists it in vars()'
  value: r = '[True, [''_sock'', ''address''], [''_cache'', ''_sock'', ''address''], False]'.

"What was COMMITTED: no socket anywhere in the stored object, and no
transient name among its stored attributes."
conn := evalPython value: '
import gemdb
gemdb.root["class_transient_test"]["conn"]
'.
names := conn _instvarNamesAfter: conn namedSize.
stored := ((1 to: conn _basicSize) collect: [:i | conn _at: i]) asOrderedCollection.
names do: [:n | stored add: (conn dynamicInstVarAt: n)].
check value: 'the committed object stores no _sock and no socket'
  value: ((names includes: #'_sock') not
    and: [(stored anySatisfy: [:v | (importlib ___grailPyTypeName___: v) = 'socket']) not]).
check value: 'the stored object is committed' value: conn isCommitted.

r := evalPython value: '
import gemdb
c = gemdb.root["class_transient_test"]["conn"]
c._sock = "replaced"
dirty = gemdb.needs_commit()
c._sock = "kept"
gemdb.abort()
repr([dirty, c._sock])
'.
check value: 'a transient store on a committed object is not a write; an abort leaves it'
  value: r = '[False, ''kept'']'.


"TRANSIENT CLASS ATTRIBUTES (docs/Persistent_Modules_and_Classes.md §8.2):
the body's value is a committed template; each session mutates its own copy."
r := evalPython value: '
import gemdb
from grail_class_transient_fixture import Registry, SubRegistry
Registry._cache["a"] = 1
r = [gemdb.needs_commit(), Registry._cache, SubRegistry._cache is Registry._cache,
     Registry()._cache is Registry._cache]
repr(r)
'.
check value: 'a transient class attribute: mutating this session''s copy is not a write'
  value: r = '[False, {''a'': 1}, True, True]'.
check value: 'the committed template is untouched'
  value: (evalPython value: '
from grail_class_transient_fixture import Registry
repr(Registry.___grailOwnClassAttr___("_cache"))
') = '{}'.

"The audit's other half: a committed class-body container mutated in place
IS a write, and deploy_check names it -- but not the transient one."
r := evalPython value: '
import gemdb, gemstone
from grail_class_transient_fixture import Registry
Registry.shared["x"] = 1
dirty = gemdb.needs_commit()
found = gemstone.deploy_check("grail_class_transient_fixture")
gemdb.abort()
repr([dirty, found])
'.
check value: 'deploy_check names a committed class-body dict this transaction wrote, and only it'
  value: r = '[True, [''grail_class_transient_fixture.Registry.shared (a dict) -> committed class-body container written by this transaction; name it in __transient__ to keep it per session'']]'.

out cr.
failures isEmpty ifFalse: [
  out nextPutAll: 'class-transient session-1 checks FAILED:'; cr.
  failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr].
  ExitClientError signal: 'class-transient test failed!' status: 1].
out nextPutAll: 'class-transient session 1: all checks passed.'; cr.
%
logout

! ===========================================================================
! Session 2 -- a fresh session reads the committed instance back.
! ===========================================================================
login
run
| dir |
dir := importlib grailDir.
dir ifNotNil: [
  (System gemEnvironmentVariable: 'GRAIL_DIR') = dir ifFalse: [
    System gemEnvironmentVariable: 'GRAIL_DIR' put: dir]]
%
level 0
run
| out evalPython failures check r tmpDir |
out := GsFile stdout.
evalPython := [:src |
  | moduleScope scope module |
  moduleScope := SymbolDictionary new.
  scope := System myUserProfile symbolList copy.
  scope insertObject: moduleScope at: 1.
  module := ModuleAst parseSource: src.
  module useTempsForBlock: false.
  module ensureModuleScope: moduleScope.
  module evaluateWithScope: scope].
failures := OrderedCollection new.
check := [:label :ok |
  ok
    ifTrue: [out nextPutAll: '  PASS  ', label; cr]
    ifFalse: [failures add: label. out nextPutAll: '  FAIL  ', label; cr]].
tmpDir := importlib grailTmpDir.

[ evalPython value: 'import sys
if "' , tmpDir , '" not in sys.path:
    sys.path.append("' , tmpDir , '")
import grail_class_transient_fixture'.

  r := evalPython value: '
import gemdb
c = gemdb.root["class_transient_test"]["conn"]
first = c._sock
second = c._sock
inits = c.inits
del c._sock
r = [first, second is first, inits, hasattr(c, "_sock")]
p = gemdb.root["class_transient_test"]["pool"]
r.append(p._sock)
r.append(hasattr(p, "_cache"))
import grail_class_transient_fixture as m
r.append(m.default._sock)
repr(r)
'.
  check value: 'a new session: __session_init__ rebuilds the transient attribute, once per object'
    value: r = '[''rebuilt:db1'', True, 1, False, ''rebuilt:db2'', False, ''rebuilt:db0'']'.

  "The check above ran __session_init__, which writes a committed object;
  start this one from a clean transaction (the overlay copy survives)."
  System abortTransaction.
  r := evalPython value: '
import gemdb
from grail_class_transient_fixture import Registry
r = [dict(Registry._cache)]
Registry._cache["b"] = 2
r.append(Registry._cache)
r.append(gemdb.needs_commit())
repr(r)
'.
  check value: 'a new session gets its own fresh copy of a transient class attribute'
    value: r = '[{}, {''b'': 2}, False]'.
] ensure: [
  System abortTransaction.
  evalPython value: '
import gemdb
gemdb.root.pop("class_transient_test", None)
'.
  System commit.
  importlib ___forgetCanonicalModule___: 'grail_class_transient_fixture'.
  System commit.
  GsFile removeServerFile: tmpDir , '/grail_class_transient_fixture.py'].

"Forgetting the module lets its classes go from the set every session seeds
transient class attributes from, or the set would pin them."
check value: 'forgetting the module removes its classes from the transient-class registry'
  value: ((UserGlobals at: #'GrailTransientClassAttrClasses' ifAbsent: [#()])
    anySatisfy: [:c | #(#Registry #SubRegistry) includes: c name]) not.

out cr.
failures isEmpty
  ifTrue: [
    out nextPutAll: 'class-transient test: all checks passed.'; cr.
    ExitClientError signal: 'class-transient test passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'class-transient test FAILED:'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr].
    ExitClientError signal: 'class-transient test failed!' status: 1].
%
logout
! Reachable only when the run aborted before its ExitClientError status
! report -- fail loudly instead of exit 0.
exit 1
