"Grail post-load: run by Rowan's loader after it applies the Grail project.
Each step is evaluated on its own, in order: later steps refer to globals that earlier
steps create. Generated from the classic install (src/smalltalk/install.gs and the
files it inputs); each step names the file and line it came from."
{
	"src/smalltalk/Python/NotImplementedType.gs:300"
	'(System myUserProfile symbolList objectNamed: #''Python'')
	at: #''NotImplemented'' put: (NotImplementedType ___instance___).
Transcript show: ''Bound Python ''''NotImplemented'''' to the NotImplementedType singleton''.
'.
	"src/smalltalk/Python/NoneType.gs:347"
	'(System myUserProfile symbolList objectNamed: #''Python'')
	at: #''None'' put: (NoneType ___instance___).
Transcript show: ''Bound Python ''''None'''' to the NoneType singleton''.
'.
	"src/smalltalk/Python/ellipsis.gs:295"
	'(System myUserProfile symbolList objectNamed: #''Python'')
	at: #''Ellipsis'' put: (ellipsis ___instance___).
Transcript show: ''Bound Python ''''Ellipsis'''' to the ellipsis singleton''.
'.
	"src/smalltalk/Python/BaseException.gs:2"
	'(Globals at: #Exception) ifNil: [self error: ''Exception is not defined. Check file ordering.''].
'.
	"src/smalltalk/Python/BaseException.gs:8601"
	'BaseException ___initCatchAll___.
BaseException ___catchAll___ printString
'.
	"src/smalltalk/Python/PyModuleDict.gs:2"
	'PyInstanceDict ifNil: [self error: ''PyInstanceDict is not defined. Check file ordering.''].
module ifNil: [self error: ''module is not defined. Check file ordering.''].
'.
	"src/smalltalk/Python/MethodWrappers.gs:526"
	'Python at: #''staticmethod'' put: PyStaticMethod.
Python at: #''classmethod'' put: PyClassMethod.
true
'.
	"src/smalltalk/install.gs:1794"
	'Python at: #''property'' put: PropertyDescriptor.
Transcript show: ''Registered: property -> PropertyDescriptor''.
'.
	"src/smalltalk/Python/type.gs:676"
	'(Python at: #''type'') == type
	ifFalse: [self error: ''Python at: #type is not the type class''].
type
'.
	"src/smalltalk/Python/builtins_docstrings.gs:30"
	'(System myUserProfile symbolList objectNamed: #''Python'')
	ifNil: [self error: ''Python dictionary is not defined. Check file ordering.''].
builtins ifNil: [self error: ''builtins is not defined. Check file ordering.''].
'.
	"src/smalltalk/Python/PyEnumTypes.gs:23"
	'PythonInstance ifNil: [self error: ''PythonInstance is not defined. Check file ordering.''].
AbstractPyInt ifNil: [self error: ''AbstractPyInt is not defined. Check file ordering.''].
'.
	"src/smalltalk/Python/enum.gs:742"
	'enum @env1:clearInstance.
'.
	"src/smalltalk/Python/ShimStatisticsModule.gs:2"
	'NativeModule ifNil: [self error: ''NativeModule is not defined. Check file ordering.''].
CPythonShim ifNil: [self error: ''CPythonShim is not defined. Check file ordering.''].
'.
	"src/smalltalk/Python/ShimBisectModule.gs:2"
	'NativeModule ifNil: [self error: ''NativeModule is not defined. Check file ordering.''].
CPythonShim ifNil: [self error: ''CPythonShim is not defined. Check file ordering.''].
'.
	"src/smalltalk/Python/ShimCrc32cModule.gs:2"
	'NativeModule ifNil: [self error: ''NativeModule is not defined. Check file ordering.''].
CPythonShim ifNil: [self error: ''CPythonShim is not defined. Check file ordering.''].
'.
	"src/smalltalk/Python/ShimTestModule.gs:2"
	'NativeModule ifNil: [self error: ''NativeModule is not defined. Check file ordering.''].
CPythonShim ifNil: [self error: ''CPythonShim is not defined. Check file ordering.''].
'.
	"src/smalltalk/Python/ShimSreModule.gs:2"
	'NativeModule ifNil: [self error: ''NativeModule is not defined. Check file ordering.''].
CPythonShim ifNil: [self error: ''CPythonShim is not defined. Check file ordering.''].
'.
	"src/weakref/WeakReference.gs:49"
	'Object ifNil: [self error: ''Object is not defined.''].
(System myUserProfile symbolList objectNamed: #''Python'')
	ifNil: [self error: ''Python dictionary is not defined. Check file ordering.''].
'.
	"src/weakref/WeakReference.gs:56"
	'| dict |
dict := System myUserProfile symbolList objectNamed: #''Python''.
#( #''WeakReference'' #''WeakReferenceHolder'' #''WeakReferenceEphemeron''
   #''FinalizerEphemeron''
   #''WeakValueDictionary'' #''WeakKeyDictionary'' #''WeakSet'' )
	do: [:nm | (dict includesKey: nm) ifFalse: [dict at: nm put: nil]].
true
'.
	"src/smalltalk/Python/hashlib.gs:2"
	'NativeModule ifNil: [self error: ''NativeModule is not defined. Check file ordering.''].
PythonInstance ifNil: [self error: ''PythonInstance is not defined.  Check file ordering.''].
'.
	"src/smalltalk/Python/struct.gs:2"
	'NativeModule ifNil: [self error: ''NativeModule is not defined. Check file ordering.''].
Exception ifNil: [self error: ''Exception is not defined. Check file ordering.''].
list_iterator ifNil: [self error: ''list_iterator is not defined. Check file ordering.''].
'.
	"src/smalltalk/Python/zlib_module.gs:2"
	'NativeModule ifNil: [self error: ''NativeModule is not defined. Check file ordering.''].
Exception ifNil: [self error: ''Exception is not defined. Check file ordering.''].
PythonInstance ifNil: [self error: ''PythonInstance is not defined. Check file ordering.''].
'.
	"src/smalltalk/Python/_socket_module.gs:56"
	'NativeModule ifNil: [self error: ''NativeModule is not defined. Check file ordering.''].
OSError ifNil: [self error: ''OSError is not defined. Check file ordering.''].
'.
	"src/smalltalk/install.gs:1901"
	'"Python 3: IOError is an alias of OSError.  Register it in the Python dict so
Python code that references IOError (jinja2/requests/django exceptions.py)
resolves to the PYTHON OSError -- not the unrelated GemStone kernel IOError in
Globals, which the Grail compile symbol list no longer includes.
EnvironmentError is the other alias (PEP 3151).  It was already listed among
the builtin names, so codegen compiled it as a builtin read, but nothing bound
it and every read raised NameError -- test.pickletester''s exception table names
both aliases and failed at import."
Python at: #''IOError'' put: (Python at: #''OSError'').
Python at: #''EnvironmentError'' put: (Python at: #''OSError'').
true
'.
	"src/smalltalk/install.gs:1984"
	'System commit
'.
	"src/smalltalk/Python/PyDict.gs:2"
	'KeyValueDictionary ifNil: [self error: ''KeyValueDictionary is not defined.''].
CollisionBucket ifNil: [self error: ''CollisionBucket is not defined.''].
'.
	"src/smalltalk/Python/PyDict.gs:573"
	'Python at: #''dict'' put: PyDict.
'.
	"src/smalltalk/Python/ExecBlockAttrs.gs:46"
	'Object ifNil: [self error: ''Object is not defined.''].
(System myUserProfile symbolList objectNamed: #''Python'')
	ifNil: [self error: ''Python dictionary is not defined. Check file ordering.''].
'.
	"src/smalltalk/install.gs:2013"
	'System commit
'.
	"src/smalltalk/install.gs:2022"
	'numbers @env1:instance.
'.
	"src/smalltalk/install.gs:2025"
	'System commit
'.
	"src/smalltalk/install.gs:2066"
	'Enum @env1:___grailInstallMemberProperties___.
'.
	"src/smalltalk/install.gs:2069"
	'System commit
'.
	"src/smalltalk/install.gs:2071"
	'DynamicClassAttribute @env1:___stampPythonIdentity___: ''enum'' qualname: ''property''.
'.
	"src/smalltalk/install.gs:2074"
	'System commit
'.
	"src/smalltalk/install.gs:2088"
	'#( #tuple #object #importlib #set #list #slice #complex ) do: [:each |
	Python at: (''___'' , each , ''___'') asSymbol put: (Python at: each)].
true
'.
	"src/smalltalk/install.gs:2093"
	'System commit
'.
	"src/smalltalk/install.gs:2095"
	'Transcript show: ''Step 4 complete: Python built-in type classes loaded''.
'.
	"src/smalltalk/install.gs:2104"
	'Transcript show: ''Step 5: Loading AST classes...''.
'.
	"src/smalltalk/PythonAst/PythonTokenizer.gs:37"
	'PythonTokenizer _addInvariantClassVar: #Lf value: Character lf ;
                _addInvariantClassVar: #Tab value: Character tab ;
                _addInvariantClassVar: #FormFeed value: (Character codePoint: 12) .
true
'.
	"src/smalltalk/PythonAst/PythonTokenizer.gs:65"
	'| dict |
dict := StringKeyValueDictionary new .
PythonTokenizer keywords do:[:aWord |
  dict at: aWord put: 1 .
].
PythonTokenizer _addInvariantClassVar: #KeywordDict value: dict .
true
'.
	"src/smalltalk/install.gs:2244"
	'Transcript show: ''Step 5 complete: AST classes loaded''.
'.
	"src/smalltalk/install.gs:2266"
	'Transcript show: ''Step 6: Loading test classes...''.
'.
	"src/smalltalk/PythonTests/CPythonShimTestCase.gs:2"
	'PythonTestCase ifNil: [self error: ''PythonTestCase is not defined. Check file ordering.''].
CPythonShim ifNil: [self error: ''CPythonShim is not defined. Check file ordering.''].
'.
	"src/smalltalk/PythonTests/SmalltalkForwarderTestCase.gs:64"
	'Python at: #''GrailForwarderTarget'' put: GrailForwarderTarget.
'.
	"src/smalltalk/PythonTests/SreTestCase.gs:2"
	'PythonTestCase ifNil: [self error: ''PythonTestCase is not defined. Check file ordering.''].
CPythonShim ifNil: [self error: ''CPythonShim is not defined. Check file ordering.''].
_sre ifNil: [self error: ''_sre is not defined. Check file ordering.''].
'.
	"src/weakref/WeakReferenceTestCase.gs:17"
	'PythonTestCase ifNil: [self error: ''PythonTestCase is not defined. Check file ordering.''].
WeakReference ifNil: [self error: ''WeakReference is not defined. Load WeakReference.gs first.''].
'.
	"src/weakref/WeakReferenceTestCase.gs:23"
	'| dict |
dict := System myUserProfile symbolList objectNamed: #''PythonTests''.
#( #''WeakReferenceTestSubject'' #''WeakReferenceTestCase'' )
	do: [:nm | (dict includesKey: nm) ifFalse: [dict at: nm put: nil]].
true
'.
	"src/smalltalk/install.gs:3263"
	'Transcript show: ''Step 6 complete: Test classes loaded''.
'.
	"src/smalltalk/install.gs:3270"
	'| userProfile symbolList names pythonDict pythonASTDict embeddedPythonDict pythonTestsDict embeddedPythonTestsDict |
userProfile := System myUserProfile.
symbolList := userProfile symbolList.
names := symbolList names.

Transcript cr; show: ''===============================================''.
Transcript show: ''Installation Verification''.
Transcript show: ''===============================================''.

"Check Python dictionary (loaded first)"
(names includes: #''Python'') ifTrue: [
	pythonDict := symbolList objectNamed: #''Python''.
	Transcript show: ''Python dictionary: OK ('', pythonDict size printString, '' types)''.
	Transcript show: ''  - object -> '', (pythonDict at: #''object'' ifAbsent: [''MISSING'']) printString.
] ifFalse: [
	Transcript show: ''Python dictionary: MISSING!''.
].

"Check PythonAst dictionary (loaded second, can reference Python types)"
(names includes: #''PythonAst'') ifTrue: [
	pythonASTDict := symbolList objectNamed: #''PythonAst''.
	Transcript show: ''PythonAst dictionary: OK ('', pythonASTDict size printString, '' classes)''.
] ifFalse: [
	Transcript show: ''PythonAst dictionary: MISSING!''.
].

"Check EmbeddedPython dictionary (embedded-CPython production classes)"
(names includes: #''EmbeddedPython'') ifTrue: [
	embeddedPythonDict := symbolList objectNamed: #''EmbeddedPython''.
	Transcript show: ''EmbeddedPython dictionary: OK ('', embeddedPythonDict size printString, '' classes)''.
] ifFalse: [
	Transcript show: ''EmbeddedPython dictionary: MISSING!''.
].

"Check PythonTests dictionary (loaded last, can reference both Python and PythonAst)"
(names includes: #''PythonTests'') ifTrue: [
	pythonTestsDict := symbolList objectNamed: #''PythonTests''.
	Transcript show: ''PythonTests dictionary: OK ('', pythonTestsDict size printString, '' test classes)''.
] ifFalse: [
	Transcript show: ''PythonTests dictionary: MISSING!''.
].

"Check EmbeddedPythonTests dictionary (embedded-CPython test classes)"
(names includes: #''EmbeddedPythonTests'') ifTrue: [
	embeddedPythonTestsDict := symbolList objectNamed: #''EmbeddedPythonTests''.
	Transcript show: ''EmbeddedPythonTests dictionary: OK ('', embeddedPythonTestsDict size printString, '' test classes)''.
] ifFalse: [
	Transcript show: ''EmbeddedPythonTests dictionary: MISSING!''.
].
System commit .
Transcript show: ''===============================================''.
Transcript show: '' Smalltail Installation complete!''.
Transcript show: ''===============================================''.
'.
	"src/smalltalk/install.gs:3331"
	'(sys @env1:modules) at: #''hashlib'' put: hashlib @env1:instance.
(sys @env1:modules) at: #''_thread'' put: _thread @env1:instance.
(sys @env1:modules) at: #''time'' put: time @env1:instance.
(sys @env1:modules) at: #''secrets'' put: secrets @env1:instance.
(sys @env1:modules) at: #''warnings'' put: warnings @env1:instance.
(sys @env1:modules) at: #''struct'' put: struct @env1:instance.
(sys @env1:modules) at: #''mimetypes'' put: mimetypes @env1:instance.
(sys @env1:modules) at: #''datetime'' put: datetime @env1:instance.
(sys @env1:modules) at: #''json'' put: json @env1:instance.
(sys @env1:modules) at: #''io'' put: io @env1:instance.
"numbers must resolve to the Smalltalk ABC module (real
__instancecheck__ + Integer/Float/Fraction registrations); an
unregistered name would fall through to a filesystem probe."
(sys @env1:modules) at: #''numbers'' put: numbers @env1:instance.
'.
	"src/smalltalk/install.gs:3348"
	'"Assert no name overlap between Python/EmbeddedPython or PythonTests/EmbeddedPythonTests.
(an accidental duplicate should fail fast rather than shadow silently)."
| symbolList overlapBetween |
symbolList := System myUserProfile symbolList.
overlapBetween := [:nameA :nameB |
	| a b |
	a := (symbolList objectNamed: nameA) keys.
	b := (symbolList objectNamed: nameB) keys.
	"Rowan keeps its registry under this key in every dictionary it loads into"
	a select: [:k | k ~~ #''RwSymbolDictionaryRegistry'' and: [b includes: k]]
].
(overlapBetween value: #''Python'' value: #''EmbeddedPython'') ifNotEmpty: [:overlap |
	self error: ''Name overlap between Python and EmbeddedPython: '', overlap printString.
].
(overlapBetween value: #''PythonTests'' value: #''EmbeddedPythonTests'') ifNotEmpty: [:overlap |
	self error: ''Name overlap between PythonTests and EmbeddedPythonTests: '', overlap printString.
].
Transcript show: ''No-overlap assertion: OK''.
'.
	"src/smalltalk/install.gs:3373"
	'Transcript show: ''Native module instances committed: '' , NativeModule ___installCommittedInstances___ printString.
'.
	"src/smalltalk/install.gs:3376"
	'System commit
'.
	"src/smalltalk/install.gs:3378"
	'| libPath pyPath |
importlib grailDir: (System gemEnvironmentVariable: ''GRAIL_DIR'').
"Pure-Smalltalk modules — registered unconditionally."
importlib registerModule: ''grail'' with: grail ___instance___.
importlib registerModule: ''_weakref'' with: _weakref ___instance___.
importlib registerModule: ''_subprocess'' with: _subprocess ___instance___.
"CPython''s os.path is a real importable module (an alias of posixpath);
django.utils._os does ``from os.path import abspath, ...''''."
importlib registerModule: ''os.path'' with: os_path ___instance___.
"CPython defines JSONDecodeError in json.decoder and re-exports it, so
``import json.decoder'''' and ``from json.decoder import JSONDecodeError''''
both have to resolve -- django and requests spell it both ways."
importlib registerModule: ''json.decoder'' with: json_decoder ___instance___.
libPath := System gemEnvironmentVariable:''SHIM_LIB_PATH''.
(libPath notNil and: [libPath notEmpty]) ifTrue: [
	"Only record the path (CPythonShim isConfigured then holds).  The shim
	and embedded backend coexist in one image, chosen per gem; registering
	the shim''s built-ins here would force it image-wide, so they resolve
	lazily instead (see CPythonShim>>builtinModuleNamed:)."
	CPythonShim libraryPath: libPath .
].
"The OpenSSL callback library (src/c/ssl), when install.sh built one.
Recorded unconditionally so a rebuild without it clears a stale path."
_grail_openssl callbackLibraryPath: ((System gemEnvironmentVariable: ''GRAIL_SSL_LIB_PATH'')
	ifNotNil: [:p | p isEmpty ifTrue: [nil] ifFalse: [p]]).
pyPath := System gemEnvironmentVariable:''PYTHON_LIB_PATH'' .
(pyPath notNil and: [pyPath notEmpty]) ifTrue: [
	CPythonLibrary libraryPath: pyPath .
	CPythonLibrary pythonHomePath: (System gemEnvironmentVariable:''PYTHON_PREFIX'') .
	CPythonLibrary pythonPackagePath: (System gemEnvironmentVariable:''PYTHON_PACKAGE_PATH'') .
].
"RUNTIME-GENERATION STAMP: this install just RECREATED the Python runtime
classes (exceptions, builtins) with new object identity.  Any canonical
module deployed under the previous runtime keeps compiled references to the
OLD classes -- warm-binding it would raise exceptions no except clause can
match.  Bumping the generation makes importlib''s
___canonicalGenerationCheck___ discard the stale registries on first touch;
the next deploy rebuilds them against the current runtime."
UserGlobals
	at: #''GrailRuntimeGeneration''
	put: ((UserGlobals at: #''GrailRuntimeGeneration'' otherwise: 0) + 1).
'.
	"src/smalltalk/install.gs:3421"
	'System commit
'.
	"src/smalltalk/install.gs:3423"
	'Transcript show: ''===============================================''.
Transcript show: '' CPythonShim Installation complete!''.
Transcript show: ''===============================================''.
'
} do: [ :step | step evaluate ]
