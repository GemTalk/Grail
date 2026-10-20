"Grail pre-load: run by Rowan's loader before it applies the Grail project.
Each step is evaluated on its own, in order: later steps refer to globals that earlier
steps create. Generated from the classic install (src/smalltalk/install.gs and the
files it inputs); each step names the file and line it came from."
{
	"src/smalltalk/install.gs:51"
	'Stream installPortableStreamImplementation
'.
	"src/smalltalk/install.gs:67"
	'Transcript := TranscriptStreamPortable new.
'.
	"src/smalltalk/install.gs:105"
	'| policy home symList idx |
policy := GsPackagePolicy current.
policy disable.
symList := System myUserProfile symbolList.
"An upgrade KEEPS this user''s own GrailSessionMethods.  Rowan loaded the kernel
 extensions into it as session methods, and its diff of the new source against
 them is what adds, changes and removes them: a fresh dictionary would lose every
 extension the new source did not change.
 Any other GrailSessionMethods -- notably a shared, foreign-owned one left by an
 earlier GsPackageLibrary-based install -- is dropped from THIS user''s symbol list
 and replaced by a fresh, user-owned one.  Removing the reference only mutates this
 user''s own symbol list; it does not touch the (possibly foreign) old dictionary."
home := symList objectNamed: #''GrailSessionMethods''.
(home notNil and: [System canWrite: home]) ifFalse: [
	[ (idx := symList names indexOf: #''GrailSessionMethods'') > 0 ]
		whileTrue: [ symList removeAtIndex: idx ].
	home := SymbolDictionary new name: #''GrailSessionMethods''; yourself.
	System myUserProfile insertDictionary: home at: 1.
	GsPackage installIn: home].
policy homeSymbolDict: home.
policy externalSymbolList: { Globals }.
policy enable.
System commit.
Transcript show: ''Session-method policy enabled (per-user home=GrailSessionMethods, external={Globals})''.
'.
	"src/smalltalk/RepairHostExtent.gs:44"
	'| sel meth src fixed cat |
sel := #''_basicRemoveSelector:environmentId:''.
meth := Behavior compiledMethodAt: sel otherwise: nil.
meth == nil ifTrue: [
	Transcript show: ''RepairHostExtent: Behavior>>'', sel, '' not found -- nothing to repair (OK)''.
	^ nil].
src := meth sourceString.
(src includesString: ''MethodRemovedAnnouncement'') ifFalse: [
	Transcript show: ''RepairHostExtent: Behavior>>'', sel, '' is unpatched -- nothing to repair (OK)''.
	^ nil].
(src includesString: ''oldMeth ~~ nil'') ifTrue: [
	Transcript show: ''RepairHostExtent: Behavior>>'', sel, '' already repaired (OK)''.
	^ nil].
fixed := src copyReplaceAll: ''removedFromSelf ifTrue:[''
	with: ''(removedFromSelf and: [oldMeth ~~ nil]) ifTrue:[''.
fixed = src ifTrue: [
	Transcript show: ''RepairHostExtent: WARNING -- Behavior>>'', sel,
		'' carries the announcement patch but not the expected source shape;'',
		'' leaving it alone.  Removing any env-1 method will raise a'',
		'' MessageNotUnderstood (nil #selector) until this is fixed by hand.''.
	^ nil].
cat := Behavior categoryOfSelector: sel environmentId: 0.
[
	Behavior
		compileMethod: fixed
		dictionaries: System myUserProfile symbolList
		category: cat
		environmentId: 0.
	"With GsPackagePolicy enabled this lands in the session GsPackage
	 (UserGlobals at: #GsPackage_Current), replacing the broken override
	 for every session that loads it; the persistent kernel method is
	 untouched.  Commit so the repaired package survives this session."
	System commitTransaction
		ifFalse: [Transcript show: ''RepairHostExtent: WARNING -- commit failed; repair is session-local only.'']
		ifTrue: [Transcript show: ''RepairHostExtent: repaired Behavior>>'', sel,
			'' (guarded method-removal announcement with `oldMeth ~~ nil`) and committed''].
] on: Error do: [:ex |
	Transcript show: ''RepairHostExtent: WARNING -- recompile of Behavior>>'', sel,
		'' failed ('', ex messageText printString,
		'').  Removing any env-1 method will raise a MessageNotUnderstood'',
		'' (nil #selector) until this is fixed by hand.''.
].
'.
	"src/smalltalk/install.gs:164"
	'| capMB usedMB freeMB headroomMB |
capMB := (System stoneConfigurationAt: #StnMaxReposSize) * 16384 / 1048576.
usedMB := (SystemRepository fileSizeOfExtent: SystemRepository fileNames first)
	/ 1048576.
freeMB := SystemRepository freeSpace / 1048576.
"ZERO MEANS UNLIMITED, NOT A ZERO CAP.  StnMaxReposSize is 0 when
 STN_MAX_REPOSITORY_SIZE is unset -- the stone then bounds the repository by the
 KEYFILE limit instead and says so in its log (``REPOS MAX: ... Mbytes'''').  Read
 literally, a 0 cap makes the headroom term NEGATIVE for any non-empty
 repository -- measured on gs40: (0 - 7504) + 6031 = -1473 -- so the test below
 was true on every install and the MFC ran every time, on a stone with 6 GB
 free.  That is the mirror image of the bug this guard was written for, where
 the term could never be true and the MFC had never once run.

 It stopped being harmless once the stone''s session limit was raised: an MFC
 needs every session to VOTE, and with several worktrees holding idle sessions
 the vote does not complete, so install.sh died with

     Request for MFC gclock ... denied, reason: vote state is voting
     ERROR 2501 ... Request for gcLock timed out

 in Repository >> markForCollection, aborting the install.  With no configured
 cap the only meaningful headroom is the free space itself."
headroomMB := capMB <= 0
	ifTrue: [freeMB]
	ifFalse: [(capMB - usedMB) + freeMB].
"1 GB is what MFC needs to work in; the failed install had 16 MB."
headroomMB < 1024 ifTrue: [
	"SKIP, DON''T CONTEND, when another GC is under way.  Several worktrees
	 share one stone, so another session''s MFC, reclaim or epoch -- or a vote
	 its test shards have not finished -- is routine.  markForCollection then
	 waits up to 2 minutes for the gcLock and raises ERROR 2501
	 (rtErrGetGcLockFailed), killing an install whose code was fine.  This MFC
	 is housekeeping and the next install can run it, so a busy collector is a
	 reason to skip it, not to fail.  Both probes work for an ordinary user:
	 sessionsHoldingGcLock answers an empty Array, and voteState 0 (IDLE),
	 when nothing is collecting.  The handler covers what the probe cannot see:
	 a GC that starts after the probe, or a vote that stalls on a session in a
	 long transaction."
	(System sessionsHoldingGcLock notEmpty or: [System voteState ~~ 0])
		ifTrue: [
			GsFile gciLogServer: ''install: MFC skipped -- gcLock held by session(s) ''
				, System sessionsHoldingGcLock printString
				, '', vote state '' , System voteStateString]
		ifFalse: [
			[SystemRepository markForCollection; reclaimAll]
				on: Error
				do: [:e |
					GsFile gciLogServer: ''install: MFC skipped -- ''
						, e messageText asString.
					e return: nil].
			System abort]
]
'.
	"src/smalltalk/install.gs:235"
	'"Create the Grail dictionaries that do not exist yet, in reverse order (so each
 ends up nearer the front of the symbol list than the next; importlib classes
 resolve from Python before falling through to PythonModules at runtime).
 An upgrade KEEPS the ones that exist: they hold the classes Rowan is about to
 patch, and the singletons and modules every stored object refers to.  A new
 dictionary would make the stored objects instances of classes nobody names."
#(#''PythonModules'' #''EmbeddedPythonTests'' #''PythonTests'' #''EmbeddedPython'' #''PythonAst'' #''Python'') do: [:each |
	| dict |
	(System myUserProfile symbolList names includes: each)
		ifTrue: [Transcript show: each , '' dictionary kept'']
		ifFalse: [
			dict := SymbolDictionary new name: each; yourself.
			System myUserProfile insertDictionary: dict at: 1.
			Transcript show: ''Created '' , each , '' dictionary'']].

Transcript show: ''Step 1 complete: Grail dictionaries in place''.
'.
	"src/smalltalk/install.gs:264"
	'| symList |
symList := System myUserProfile symbolList .
(symList includesIdentical: GsCompilerClasses) ifFalse:[
  symList add: GsCompilerClasses.
  Transcript show: ''Added GsCompilerClasses dictionary to '', System myUserProfile userId, ''''''s symbol list''.
].
'.
	"src/smalltalk/install.gs:287"
	'(System myUserProfile symbolList objectNamed: #''Python'')
	"Unbound until the post-load binds the singletons -- and on an upgrade,
	still bound to them: stored objects refer to those, so they are kept."
	at: #''Ellipsis'' ifAbsentPut: [nil];
	at: #''None'' ifAbsentPut: [nil];
	at: #''NotImplemented'' ifAbsentPut: [nil];
	yourself.
Transcript show: ''Forward references created for Python dictionary''.
'.
	"src/smalltalk/install.gs:538"
	'(System myUserProfile symbolList objectNamed: #''PythonAst'')
	yourself.
Transcript show: ''Forward references created for PythonAst dictionary''.
'.
	"src/smalltalk/install.gs:673"
	'(System myUserProfile symbolList objectNamed: #''PythonTests'')
	yourself.
Transcript show: ''Forward references created for PythonTests dictionary''.
'.
	"src/smalltalk/install.gs:1650"
	'(System myUserProfile symbolList objectNamed: #''EmbeddedPython'')
	yourself.
Transcript show: ''Forward references created for EmbeddedPython dictionary''.
'.
	"src/smalltalk/install.gs:1665"
	'(System myUserProfile symbolList objectNamed: #''EmbeddedPythonTests'')
	yourself.
Transcript show: ''Forward references created for EmbeddedPythonTests dictionary''.
'.
	"src/smalltalk/install.gs:1677"
	'Transcript show: ''Step 2 complete: All forward references created''.
'.
	"src/smalltalk/install.gs:1698"
	'(System myUserProfile symbolList objectNamed: #''Python'')
  "Python names that map to existing GemStone globals"
	at: #''True''                       put: true;
	at: #''False''                      put: false;
	at: #''__debug__''                  put: true;
  "Python names that map to existing GemStone classes"
	at: #''bool''                       put: Boolean;
	at: #''builtin_function_or_method'' put: GsNMethod;
	at: #''bytes''                      put: ByteArray;
	at: #''dict''                       put: KeyValueDictionary;
	at: #''float''                      put: Float;
	at: #''int''                        put: Integer;
	at: #''list''                       put: OrderedCollection;
	at: #''object''                     put: Object;
	at: #''range''                      put: Interval;
	at: #''str''                        put: Unicode7;
	yourself.
Transcript show: ''Step 3 complete: Python type mappings created''.
'.
	"src/smalltalk/install.gs:1725"
	'Transcript show: ''Step 4: Loading Python built-in type classes...''.
'
} do: [ :step | step evaluate ]
