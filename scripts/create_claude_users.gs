! ===============================================================================
! Create Claude1..Claude4 GemStone users, mirroring DataCurator
! ===============================================================================
! Run as SystemUser (this script logs in as SystemUser), most easily via the
! wrapper:
!
!     ./create_claude_users.sh
!
! or directly:
!
!     topaz -lq -S scripts/create_claude_users.gs
!
! Each new user is given:
!   * the SAME privileges as DataCurator (e.g. SystemControl, SessionAccess,
!     UserPassword, ...), copied at run time so it tracks whatever DataCurator has;
!   * membership in every UserProfileGroup DataCurator belongs to (DataCuratorGroup
!     and any others);
!   * its OWN object security policy (ClaudeNObjectSecurityPolicy) whose
!     authorization mirrors DataCurator's (owner may WRITE, world may READ) -- so
!     each user's committed objects (e.g. a per-user Grail install) are
!     write-isolated from the others while staying world-readable, exactly like
!     DataCurator's own objects;
!   * the default login password 'swordfish'.
!
! Idempotent: a user that already exists is left untouched (skipped), so re-running
! only fills in whichever of Claude0..Claude3 are missing.
! ===============================================================================

set user SystemUser pass swordfish
iferr 1 stk
iferr 2 exit 1
login

fileformat utf8

run
| dc userIds createdCount |
dc := AllUsers userWithId: 'DataCurator' ifAbsent: [nil].
dc isNil ifTrue: [
	^ System error: 'DataCurator user not found; cannot mirror its permissions.' ].

userIds := #( 'Claude0' 'Claude1' 'Claude2' 'Claude3' ).
createdCount := 0.

userIds do: [:uid |
	| u pol |
	(AllUsers userWithId: uid ifAbsent: [nil]) notNil
		ifTrue: [
			GsFile stdout nextPutAll: '  skip (already exists): ', uid; lf ]
		ifFalse: [
			"Create the user."
			u := AllUsers addNewUserWithId: uid password: 'swordfish'.

			"Privileges: mirror DataCurator exactly (copy so the users don't share
			 one mutable collection)."
			u privileges: dc privileges copy.

			"Groups: join every group DataCurator is in.  addUser: is a no-op for
			 the default groups a fresh user already belongs to."
			dc groups do: [:grp | grp addUser: u].

			"Own object security policy, authorization mirroring DataCurator's
			 (owner=write, world=read): write-isolated per user, world-readable."
			pol := GsObjectSecurityPolicy newInRepository: SystemRepository.
			pol name: uid, 'ObjectSecurityPolicy'.
			pol owner: u.
			pol ownerAuthorization: #'write'.
			pol worldAuthorization: #'read'.
			u defaultObjectSecurityPolicy: pol.

			createdCount := createdCount + 1.
			GsFile stdout
				nextPutAll: '  created: ', uid,
					'  (policy #', pol number printString,
					', groups ', dc groups size printString,
					', privileges ', dc privileges size printString, ')'; lf ] ].

System commitTransaction.

GsFile stdout
	nextPutAll: '==============================================='; lf;
	nextPutAll: ' Claude users: ', createdCount printString, ' created, ',
		(userIds size - createdCount) printString, ' already existed'; lf;
	nextPutAll: ' Each mirrors DataCurator groups + privileges and owns a'; lf;
	nextPutAll: ' ClaudeNObjectSecurityPolicy (owner=write, world=read).'; lf;
	nextPutAll: ' Login password: swordfish.'; lf;
	nextPutAll: '==============================================='; lf;
	flush.
%

logout
