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
!
! TWO namespaces, mirroring CPython's split between a function's SLOTS and
! its ``__dict__'':
!
!   * the DICT table (``forBlock:'' / ``at:attr:'' / ``at:attr:put:'') holds
!     ordinary user attributes and IS what ``func.__dict__'' exposes.
!   * the SLOT table (``slotsFor:'' / ``slotAt:attr:'' / ``slotAt:attr:put:'')
!     holds the six identifying-metadata dunders CPython implements as
!     getset descriptors: __name__ __qualname__ __module__ __doc__
!     __annotations__ __type_params__.
!
! The split is not cosmetic.  ``functools.update_wrapper'' MERGES the wrapped
! function's ``__dict__'' into the wrapper's, so anything visible there gets
! copied wholesale; Grail stamps ``__name__'' / ``__annotations__'' into the
! side table at def time, and with one shared table those internal stamps
! would surface as user ``__dict__'' entries.  CPython keeps them out:
!
!     def f(): pass
!     f.__dict__            # {} -- not {'__name__': 'f'}
!     f.__wrapped__ = 1
!     f.__dict__            # {'__wrapped__': 1} -- __wrapped__ IS a dict entry
!
! ``__setattr__'' routes by name (see ExecBlock >> ___isSlotName___:), so a
! given name lives in exactly one of the two tables.
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

There are TWO independent tables, matching CPython''s split between a
function''s getset SLOTS and its ``__dict__'':

  * the DICT table (forBlock: / at:attr: / at:attr:put:) -- ordinary user
    attributes; this is what ``func.__dict__'' hands back, live.
  * the SLOT table (slotsFor: / slotAt:attr: / slotAt:attr:put:) --
    __name__ __qualname__ __module__ __doc__ __annotations__
    __type_params__, which CPython keeps OUT of __dict__.

Keeping Grail''s def-time __name__ / __annotations__ stamps in the slot
table is what stops functools.update_wrapper (which merges the wrapped
function''s whole __dict__ into the wrapper) from treating them as user
attributes.

Both dictionaries are initialized lazily on first use, and both
auto-create their per-block sub-dictionary on demand.
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
	an ordinary (non-SystemUser) user's session tries to write.  ExecBlocks
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

category: 'Grail-Access'
classmethod: ExecBlockAttrs
removeAt: aBlock attr: aName
	"Remove ``aName'' from ``aBlock'''s __dict__ table.  Answers true when
	an entry was actually removed, false when the slot was never written —
	``del block.attr'' has to tell those apart so a missing attribute
	raises AttributeError rather than silently succeeding."

	| holder |
	holder := self table at: aBlock ifAbsent: [^ false].
	(holder includesKey: aName asString) ifFalse: [^ false].
	holder removeKey: aName asString.
	^ true
%

! ------------------- Slot table (the getset dunders, kept out of __dict__)

category: 'Grail-Access'
classmethod: ExecBlockAttrs
slotTable
	"The per-session IdentityKeyValueDictionary holding SLOT values —
	__name__ / __qualname__ / __module__ / __doc__ / __annotations__ /
	__type_params__.  Separate from ``table'' (the __dict__ store) because
	CPython implements these as getset descriptors that are NOT dict
	entries, and functools.update_wrapper merges the wrapped function's
	whole __dict__ into the wrapper — with one shared table, Grail's
	def-time __name__ stamp would ride along as a user attribute.

	Same session-local storage rationale as ``table''."

	^ SessionTemps current
		at: #'___ExecBlockSlotsTable___'
		ifAbsentPut: [IdentityKeyValueDictionary new]
%

category: 'Grail-Access'
classmethod: ExecBlockAttrs
slotsFor: aBlock
	"Return the per-block SLOT dictionary, creating it on first access."

	^ self slotTable at: aBlock ifAbsentPut: [KeyValueDictionary new]
%

category: 'Grail-Access'
classmethod: ExecBlockAttrs
staticSlotTable
	"Slot values that belong to the DEF SITE rather than to one function
	object: ``__name__'', ``__code__'', ``__signature_spec__'' and
	``__annotate__'' as the compiler stamps them.  Every evaluation of the
	same ``def'' produces the same values, so they are keyed by the def site
	instead of by the function object.

	Keyed by ``aBlock method''.  Each block literal gets its OWN GsNMethod,
	so that method is a stable per-def-site identity: two evaluations of one
	def share it, two different defs never do (verified).

	Why this split exists.  The per-object slotTable holds its keys STRONGLY
	and there is no weak-keyed collection available in this GemStone (Globals
	offers only FsFileDescriptorEphemeron and GcWeakReferences; Array has no
	makeWeak).  As long as def-time stamping writes one entry per function
	OBJECT, giving each ``def'' evaluation a fresh object -- which CPython
	semantics require -- makes every function ever created immortal for the
	session; the measured result was ``VM temporary object memory is full''
	at ~100k def evaluations.  Keyed by def site, the same data is bounded by
	the number of defs in the image.

	Same session-local storage rationale as ``table''."

	^ SessionTemps current
		at: #'___ExecBlockStaticSlotsTable___'
		ifAbsentPut: [IdentityKeyValueDictionary new]
%

category: 'Grail-Access'
classmethod: ExecBlockAttrs
staticSlotsFor: aBlock
	"The def-site slot dictionary for aBlock, creating it on first access."

	^ self staticSlotTable at: aBlock method ifAbsentPut: [KeyValueDictionary new]
%

category: 'Grail-Access'
classmethod: ExecBlockAttrs
staticSlotAt: aBlock attr: aName put: aValue
	"Write a DEF-SITE slot -- what the def-time stamps use.

	Idempotent by construction: every evaluation of the def writes the same
	value under the same key, so a repeat write is skipped rather than
	re-storing it."

	| holder key |
	holder := self staticSlotsFor: aBlock.
	key := aName asString.
	(holder includesKey: key) ifTrue: [^ aValue].
	holder at: key put: aValue.
	^ aValue
%

category: 'Grail-Access'
classmethod: ExecBlockAttrs
staticSlotAt: aBlock attr: aName
	"Read a DEF-SITE slot directly, nil when unset."

	| holder |
	holder := self staticSlotTable at: aBlock method ifAbsent: [^ nil].
	^ holder at: aName asString ifAbsent: [nil]
%

category: 'Grail-Access'
classmethod: ExecBlockAttrs
slotAt: aBlock attr: aName
	"Read ``aBlock'''s slot ``aName'', nil when unset.  Direct lookup that
	skips the auto-create branch so a pure read doesn't pin the block.

	PER-OBJECT first, then the DEF SITE.  A runtime write (``setattr'', and
	functools.update_wrapper, which assigns __name__/__doc__/__annotate__ onto
	a wrapper) lands in the per-object table and so shadows what the compiler
	stamped for that def -- which is the ordering CPython has, where the
	stamp is just the function's initial value."

	| holder v |
	holder := self slotTable at: aBlock ifAbsent: [nil].
	holder ifNotNil: [
		v := holder at: aName asString ifAbsent: [nil].
		v ifNotNil: [^ v]].
	^ self staticSlotAt: aBlock attr: aName
%

category: 'Grail-Access'
classmethod: ExecBlockAttrs
slotAt: aBlock attr: aName put: aValue
	"Write ``aBlock'''s slot ``aName'' PER OBJECT -- the runtime path.  The
	def-time stamps use staticSlotAt:attr:put: instead, so they do not create
	a per-object entry for every function ever evaluated."

	(self slotsFor: aBlock) at: aName asString put: aValue.
	^ aValue
%

set compile_env: 0
