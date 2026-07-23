! ===============================================================================
! Probe: is the Grail shared base installed on this extent?
! ===============================================================================
! Logs in as the ordinary ./.topazini user (NO SystemUser step) and checks for a
! marker that ONLY ./install_base.sh (running as SystemUser) can create:
!
!     (Globals at: #GrailBaseInstalled) notNil   (Grail base-schema version)
!
! #GrailBaseInstalled is a SystemUser-owned key written into Globals by the LAST
! step of ./install_base.sh (scripts/set_base_marker.gs), on BOTH legacy and modern
! kernels.  A per-user ./install.sh runs as an ordinary user and cannot write
! Globals, so the key's presence unambiguously means install_base.sh ran to
! completion here (it exits on any earlier error, so a partial run never reaches
! the marker step).
!
! This is a DEDICATED flag, deliberately not a reused side effect: earlier the
! guard keyed off Unicode comparison mode ((Globals at: #StringConfiguration) ==
! Unicode16), but a site could enable Unicode mode for its own reasons and thereby
! fake a "base present" verdict.  Nothing but set_base_marker.gs sets this key.
!
! Output contract (parsed by install.sh):
!   * prints  GRAIL_BASE=present  when unicode comparison mode is set
!   * prints  GRAIL_BASE=absent   when it is not
!   * prints  neither             if login itself fails (stone down / bad creds) --
!                                 install.sh then steps aside and lets the real
!                                 install.gs surface that error instead.
! ===============================================================================

iferr 1 stk
iferr 2 stk
login

run
((Globals at: #GrailBaseInstalled otherwise: nil) notNil)
    ifTrue:  [ GsFile stdout nextPutAll: 'GRAIL_BASE=present'; lf; flush ]
    ifFalse: [ GsFile stdout nextPutAll: 'GRAIL_BASE=absent';  lf; flush ].
true
%

logout
