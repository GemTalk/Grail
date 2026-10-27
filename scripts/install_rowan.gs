! ===============================================================================
! Grail installation through Rowan -- the counterpart of src/smalltalk/install.gs.
!   file  scripts/install_rowan.gs   (run by install.sh when GRAIL_INSTALL=rowan)
! Needs an extent with Rowan masterV4 7d50ec0c8 or later (shadowsGlobals, unicodeSource,
! gs_superclassDictionary, per-user session-method extensions of kernel classes).
! ===============================================================================
! Rowan loads the Grail project (rowan/specs/Grail.ston) from $GRAIL_DIR; the component's
! pre-/post-load doits (rowan/components/doits) carry install.gs's other steps.
! ===============================================================================
output pushnew install.out
fileformat utf8
iferr 1 exit 1
login

iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

run
| grailDir warnings symList moved project previousMigrator dropped |
grailDir := System gemEnvironmentVariable: 'GRAIL_DIR'.
grailDir ifNil: [ ^ self error: 'GRAIL_DIR is not set' ].
warnings := OrderedCollection new.
"No Grail class named Package (#1799).  Rowan's Tonel reader resolves the
``Package { #name : ... }'' marker in every package.st through the symbol list --
before the Dictionary it was told to use, in Rowan older than masterV4 bafddb0f6,
which 4.0.0.a5 ships -- so a Grail class of that name made it fail with
'a Package does not understand #at:ifAbsent:', for Grail's own reinstall and for
every other Rowan project loaded into a Grail image.  Grail's source has had no
such class since #1722; this removes one an earlier install left:

  - one Rowan does NOT own -- made by the topaz install.gs, as GemDB's Grail
    a78e8c03 has -- is removed now, for good: nothing would ever delete it, since
    Rowan never loaded it, and keeping Grail's dictionaries on a reinstall means
    nothing rebuilds them without it.
  - one Rowan DOES own -- a Rowan install from before #1722 -- is only moved
    aside while the project is read, and put back for the load, which deletes it
    as a class the source no longer defines.

Either way it is the last install that finds one.  Only while the source being
installed defines no Package class itself."
symList := System myUserProfile symbolList.
moved := OrderedCollection new.
(GsFile existsOnServer: grailDir , '/src/Grail-PythonAst/Package.class.st') == true ifFalse: [
	#(#Python #PythonAst #EmbeddedPython #PythonTests #EmbeddedPythonTests) do: [:dictName |
		| dict cls owned |
		dict := symList objectNamed: dictName.
		cls := dict isNil ifTrue: [nil] ifFalse: [dict at: #Package otherwise: nil].
		(cls notNil and: [cls isBehavior and: [cls name = #Package]]) ifTrue: [
			owned := [(Rowan image loadedClassForClass: cls ifAbsent: [nil]) notNil]
				on: Error do: [:e | e return: true].
			dict removeKey: #Package.
			owned
				ifTrue: [moved add: dict -> cls.
					Transcript show: 'Moved Rowan''s Package class in ' , dictName , ' aside for the read']
				ifFalse: [Transcript show: 'Removed the leftover Package class from ' , dictName]]]].
[ project := Rowan projectFromUrl: 'file:' , grailDir , '/rowan/specs/Grail.ston' diskUrl: 'file:' , grailDir ]
	ensure: [ moved do: [:each | each key at: #Package put: each value ] ].
"Forget the methods an engine upgrade removed.  GemStone's upgradeImage removes every
method of every kernel class and disables each user's GsPackagePolicy, so none of Grail's
session methods reaches the session, without telling Rowan; Rowan's own upgrade repairs
only the projects SystemUser can see, and Grail is this user's.  Rowan then takes each of
those methods for loaded and unchanged, and the load leaves them missing.  Dropping the
LoadedMethod of every method that is gone makes the load compile it again.

Gone means: the class answers no method, or another one, for the selector IN THE
METHOD'S OWN ENVIRONMENT, session methods included.  Not Rowan's audit, which looks up
environment 0 only: it finds every env-1 (Python) method missing on every reinstall, and
dropping those LoadedMethods made Rowan forget it had loaded them, so a release that
removed one left it in place (the upgrade test's probe.removed_method and
probe.removed_session_method).  On an ordinary reinstall the policy is enabled and this
finds nothing; after an engine upgrade it finds the session methods, which the policy no
longer installs.  Before the load's pre-load doit enables the policy.

Each one dropped is remembered: once Rowan has forgotten loading it, a method the new
source no longer has is not Rowan's to delete, and is deleted after the load below."
dropped := OrderedCollection new.
((Rowan image loadedProjectNamed: 'Grail' ifAbsent: [ nil ]) "nil: a first install")
	ifNotNil: [:loaded | | stale |
		stale := 0.
		loaded loadedPackages do: [:pkg |
			{ pkg loadedClasses. pkg loadedClassExtensions } do: [:loadedClasses |
				loadedClasses do: [:lc |
					{ lc handle -> lc loadedInstanceMethods. lc handle class -> lc loadedClassMethods }
						do: [:each |
							each value values do: [:lm | | m |
								m := lm handle.
								(m isNil or: [ (each key compiledMethodAt: lm selector
										environmentId: m environmentId otherwise: nil) ~~ m ])
									ifTrue: [
										m ifNotNil: [ dropped add: { each key. lm selector asSymbol. m environmentId. m } ].
										lm loadedClass removeLoadedMethod: lm.
										stale := stale + 1 ] ] ] ] ] ].
		stale > 0 ifTrue: [
			Transcript show: 'Recompiling ' , stale printString , ' Grail methods an engine upgrade removed' ] ].
"Migrate instances to a new version of a class: a release that changes a Grail class's shape
(an instance variable added or removed) gets a new class version, and objects an application
stored are instances of the old one. Rowan's default migrator leaves them there. Reached through
the platform's own migrator because the class is not in an ordinary user's symbol list, and set
on the platform because the public project has no load: that takes one."
previousMigrator := Rowan platform instanceMigrator.
Rowan platform instanceMigrator: previousMigrator class conservativeMigration.
[ [ project load ] ensure: [ Rowan platform instanceMigrator: previousMigrator ] ]
	on: CompileWarning
	do: [:ex |
		(ex description includesString: 'not optimized') ifFalse: [ warnings add: ex description ].
		ex resume ].
"The methods dropped above that the load did not compile again are those the new source
removed: still the old method, in the user's GrailSessionMethods package or the class's own
method dictionary.  Deleted here, as Rowan deletes a removed method."
dropped isEmpty ifFalse: [ | pkg removed |
	removed := 0.
	pkg := (System myUserProfile symbolList objectNamed: #GrailSessionMethods)
		ifNotNil: [:home | home at: GsPackage globalName otherwise: nil ].
	dropped do: [:each | | beh sel env old md |
		beh := each at: 1. sel := each at: 2. env := each at: 3. old := each at: 4.
		(pkg notNil and: [ ((pkg sessionInfoFor: beh environmentId: env ifAbsent: [ nil ])
				ifNotNil: [:info | (info at: 1) at: sel otherwise: nil ]) == old ])
			ifTrue: [
				pkg removeMethodAt: sel for: beh environmentId: env.
				removed := removed + 1 ]
			ifFalse: [
				md := beh persistentMethodDictForEnv: env.
				(md notNil and: [ (md at: sel otherwise: nil) == old ]) ifTrue: [
					beh removeSelector: sel environmentId: env.
					removed := removed + 1 ] ] ].
	removed > 0 ifTrue: [
		GsPackagePolicy current refreshSessionMethodDictionary.
		Transcript show: 'Removed ' , removed printString , ' Grail methods the new source no longer has' ] ].
warnings do: [:w | Transcript show: 'COMPILE WARNING ' , w ].
Transcript show: 'Rowan loaded Grail: ' , (Rowan projectNamed: 'Grail') printString.
%
commit

run
Transcript show: '==============================================='.
Transcript show: ' Grail installed through Rowan'.
Transcript show: '==============================================='.
%
output pop
logout
exit 0
