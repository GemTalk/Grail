! ===============================================================================
! Repository Methods (GemStone repository administration for Python)
! ===============================================================================
! This file compiles env-1 INSTANCE methods onto the GemStone kernel class
! Repository so Python code can administer the repository through the gemdb
! module (src/python/stdlib/gemdb/admin.py):
!
!     import gemdb.admin
!     gemdb.admin.size()
!     gemdb.admin.backup("/path/to/backup.gz")
!     gemdb.admin.garbage_collect()
!
! `gemstone.repository` (gemstone.gs) returns SystemRepository; the attribute
! call then resolves through ___pyAttrLoad___'s instance branch to a
! BoundMethod and dispatches an env-1 method below.  These are deliberately
! INSTANCE methods on a kernel class, not methods on the gemstone module:
! a unary method on a module class is PERFORMED by a bare attribute read
! (the accessor protocol), so any introspection that reads every name --
! help(), inspect.getmembers(), a REPL completer -- would start a
! mark-for-collection.  (`dir()` itself answers names, not values, and is
! safe.)  Instance attribute reads only wrap; nothing runs
! until the Python caller writes parentheses.
!
! Like System.gs, this file references no Python globals at compile time
! (it files in before they exist); Python exception classes are resolved
! through the symbol list at runtime.  It is filed with the kernel-class
! extensions, per-user as session methods -- see
! scripts/kernel_class_extensions.gs.
! ===============================================================================

! ------------------- Remove existing Python methods from Repository
expectvalue /Metaclass3
doit
Repository removeAllMethods: 1.
Repository class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Repository Administration'
method: Repository
file_size
	"Python repository.file_size() — the repository's total size in bytes
	(Repository >> fileSize: the sum of all extent sizes)."

	^ self @env0:fileSize
%

category: 'Grail-Repository Administration'
method: Repository
free_space
	"Python repository.free_space() — bytes of free space inside the
	repository's extents (Repository >> freeSpace)."

	^ self @env0:freeSpace
%

category: 'Grail-Repository Administration'
method: Repository
full_backup: aPath
	"Python repository.full_backup(path) — write a full backup.  A path
	ending in '.gz' gets a compressed backup (fullBackupGzCompressedTo:),
	anything else a plain one (fullBackupTo:) — the extension chooses the
	format, the way tarfile does.  Kernel failures (bad directory, no
	FileControl privilege, ...) are re-raised as Python OSError so the
	caller can except them; without the translation they tear through
	Python as uncatchable Smalltalk errors."

	| p n isGz |
	p := aPath @env0:asString.
	n := p @env0:size.
	isGz := false.
	(n @env0:>= 3) ifTrue: [
		isGz := (p @env0:copyFrom: (n @env0:- 2) to: n) @env0:= '.gz'].
	^ [ isGz
			ifTrue: [self @env0:fullBackupGzCompressedTo: p]
			ifFalse: [self @env0:fullBackupTo: p] ]
		@env0:on: Error do: [:ex | | osErr msg |
			msg := ex @env0:messageText.
			msg == nil ifTrue: [msg := ex @env0:asString].
			osErr := System @env0:myUserProfile @env0:symbolList
				@env0:objectNamed: #'OSError'.
			osErr == nil ifTrue: [ex @env0:outer].
			osErr ___signal___: msg]
%

category: 'Grail-Repository Administration'
method: Repository
mark_for_collection
	"Python repository.mark_for_collection() — run the garbage-collection
	scan (Repository >> markForCollection) and return its report string.
	Long-running on a large repository; requires the GarbageCollection
	privilege and a session with no uncommitted changes (gemdb.admin
	checks that first, so the refusal is a Python exception with advice
	rather than a kernel error).  Kernel failures are re-raised as Python
	RuntimeError, same translation as full_backup:.

	The kernel RETURNS the report as a Warning object (measured on 4.0:
	'markForCollection found N live objects, M dead objects...'), so the
	text is unwrapped from its messageText rather than handed to Python
	as an opaque exception instance."

	| r |
	r := [self @env0:markForCollection]
		@env0:on: Error do: [:ex | | errCls msg |
			msg := ex @env0:messageText.
			msg == nil ifTrue: [msg := ex @env0:asString].
			errCls := System @env0:myUserProfile @env0:symbolList
				@env0:objectNamed: #'RuntimeError'.
			errCls == nil ifTrue: [ex @env0:outer].
			errCls ___signal___: msg].
	(r @env0:isKindOf: AbstractException) ifTrue: [
		r := r @env0:messageText.
		r == nil ifTrue: [r := '']].
	^ r
%

category: 'Grail-Repository Administration'
method: Repository
schema_report
	"Python repository.schema_report() -- every persistent Python class whose
	slot layout holds an attribute nothing assigns any more, or a hole a drop
	left, with the instance counts that say how much data each is carrying
	(object class >> ___grailSchemaReport___; docs/Schema_Evolution_Design.md).
	gemdb.schema.report() wraps it.

	ON THE REPOSITORY INSTANCE, not on the gemstone module, and for the reason
	docs/GemDB_Module.md gives for the administration primitives: a unary
	method on a MODULE class is performed by a bare attribute read, so a
	module-level spelling would run this -- a full repository scan -- from
	``inspect.getmembers(gemstone)'' or a REPL completer.  An instance
	attribute read only wraps; nothing runs until the caller writes
	parentheses.

	Needs a session with no uncommitted changes (the scan aborts first);
	gemdb.schema checks that ahead of the call, so the refusal is a Python
	exception with advice rather than a kernel error."

	^ object ___grailSchemaReport___
%

category: 'Grail-Repository Administration'
method: Repository
schema_rebase: aName
	"Python repository.schema_rebase('module.Class') -- perform the base change
	an import refuses, moving every instance of the class and of its subtree
	onto the rebuilt class instead of stranding them
	(importlib class >> ___grailRebaseClass___:; docs/Schema_Evolution_Design.md).
	gemdb.schema.rebase() wraps it, owns the clean-transaction check and
	commits.

	A KEYWORD method, so the module-class hazard schema_report's comment
	describes does not arise here -- nothing performs it by a bare attribute
	read -- but it stays beside its sibling on the Repository instance so the
	whole schema surface has one home."

	^ importlib @env0:___grailRebaseClass___: aName
%

category: 'Grail-Repository Administration'
method: Repository
schema_drop_class: aName
	"Python repository.schema_drop_class('module.Class') -- forget a class the
	source no longer defines, but only once nothing is stored against it
	(importlib class >> ___grailDropCanonicalClass___:).  gemdb.schema.drop_class()
	wraps it."

	^ importlib @env0:___grailDropCanonicalClass___: aName
%

category: 'Grail-Repository Administration'
method: Repository
schema_rename_class: aName _: newName
	"Python repository.schema_rename_class('module.Old', 'New') -- move a
	renamed class's instances onto the class the new source defines
	(importlib class >> ___grailRenameCanonicalClass___:to:).
	gemdb.schema.rename_class() wraps it."

	^ importlib @env0:___grailRenameCanonicalClass___: aName to: newName
%

set compile_env: 0
