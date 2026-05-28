! ===============================================================================
! ExecBlockAttrs.gs — Side-table for dynamic attributes on GemStone primitive
! closures (ExecBlock).
!
! GemStone's primitive ExecBlock has no varying instVars, so the default
! Object>>__setattr__ path (dynamicInstVarAt:put: on the receiver) raises an
! ImproperOperation.  Python code legitimately tags closures with metadata —
! jinja2.async_utils sets ``wrapper.jinja_async_variant = True'' on a nested
! decorator-output closure, ``functools.partial(fn).__module__'' reads back a
! stamped value, etc.  Without a side-table, the surrounding decorator chain
! dies the first time a closure-shaped value gets ``setattr''-ed.
!
! Storage is an ``IdentityKeyValueDictionary'' keyed by ExecBlock identity,
! values are per-block ``KeyValueDictionary{ name (String) -> value }''.
! Strong refs — decorated closures live for the host module's lifetime
! anyway, and the typical usage (module-init time) attaches a bounded
! number of entries.  Replace with a WeakKeyDictionary once we have a
! profile that warrants it.
! ===============================================================================

! ------------------- Superclass / dictionary check
run
Object ifNil: [self error: 'Object is not defined.'].
(System myUserProfile symbolList objectNamed: #'Python')
	ifNil: [self error: 'Python dictionary is not defined. Check file ordering.'].
%


! ------------------- ExecBlockAttrs class definition
expectvalue /Class
doit
Object subclass: 'ExecBlockAttrs'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
ExecBlockAttrs comment:
'Side-table for ExecBlock dynamic-attribute storage.  GemStone primitive
closures have no varying instVars; this class brokers an
IdentityKeyValueDictionary keyed by ExecBlock identity so
``block.attr = value'' / ``block.attr'' round-trip through __setattr__
and __getattr__ overrides on ExecBlock.

The dictionary is initialized lazily on first use.  All access goes
through the ``forBlock:'' helper which auto-creates a per-block
sub-dictionary on demand.
'
%

expectvalue /Class
doit
ExecBlockAttrs category: 'Grail-Modules'
%

set compile_env: 0

expectvalue /Metaclass3
doit
ExecBlockAttrs removeAllMethods.
ExecBlockAttrs class removeAllMethods.
%

! ------------------- Class-side accessors

set compile_env: 0

category: 'Grail-Access'
classmethod: ExecBlockAttrs
table
	"The IdentityKeyValueDictionary keyed by ExecBlock identity.
	Stored in ``SessionTemps current'' so the dictionary is
	per-session and mutable without security-policy gymnastics —
	committed mutable storage (class-side instVars on a class
	whose policy is owned by SystemUser) raises SecurityError when
	a DataCurator-owned test session tries to write.  ExecBlocks
	themselves are transient (not committable), so per-session
	storage matches the lifetime of the values being indexed."

	^ SessionTemps current
		at: #'___ExecBlockAttrsTable___'
		ifAbsentPut: [IdentityKeyValueDictionary new]
%

category: 'Grail-Access'
classmethod: ExecBlockAttrs
forBlock: aBlock
	"Return the per-block attribute dictionary, creating it on first
	access.  The inner dictionary maps attribute-name Strings to
	values."

	^ self table at: aBlock ifAbsentPut: [KeyValueDictionary new]
%

category: 'Grail-Access'
classmethod: ExecBlockAttrs
at: aBlock attr: aName
	"Look up the value stored for ``aName'' on ``aBlock''.  Returns
	nil when the slot has never been written — callers detect a
	miss via the nil = absent invariant.  Direct lookup that skips
	the auto-create branch in ``forBlock:'' so a pure read doesn't
	pin the block in the side-table by accident."

	| holder |
	holder := self table at: aBlock ifAbsent: [^ nil].
	^ holder at: aName asString ifAbsent: [nil]
%

category: 'Grail-Access'
classmethod: ExecBlockAttrs
at: aBlock attr: aName put: aValue
	"Store ``aValue'' under ``aName'' on ``aBlock''.  Auto-creates
	the per-block sub-dictionary on first write."

	(self forBlock: aBlock) at: aName asString put: aValue.
	^ aValue
%

set compile_env: 0
