const morphTargetDragComponent = {
  schema: {
    cameraId: {default: 'camera'},
    groundId: {default: 'ground'},
    dragDelay: {default: 300},
  },
  init() {
    this.camera = document.getElementById(this.data.cameraId)
    this.threeCamera = this.camera.getObject3D('camera')
    this.ground = document.getElementById(this.data.groundId)

    this.internalState = {
      fingerDown: false,
      dragging: false,
      distance: 0,
      startDragTimeout: null,
      raycaster: new THREE.Raycaster(),
    }

    this.fingerDown = this.fingerDown.bind(this)
    this.startDrag = this.startDrag.bind(this)
    this.fingerMove = this.fingerMove.bind(this)
    this.fingerUp = this.fingerUp.bind(this)

    this.el.addEventListener('mousedown', this.fingerDown)
    this.el.sceneEl.addEventListener('onefingermove', this.fingerMove)
    this.el.sceneEl.addEventListener('onefingerend', this.fingerUp)
    this.el.classList.add('cantap')  // Needs "objects: .cantap" attribute on raycaster.
  },
  tick() {
    if (this.internalState.dragging) {
      let desiredPosition = null
      if (this.internalState.positionRaw) {
        const screenPositionX = this.internalState.positionRaw.x / document.body.clientWidth * 2 - 1
        const screenPositionY = this.internalState.positionRaw.y / document.body.clientHeight * 2 - 1
        const screenPosition = new THREE.Vector2(screenPositionX, -screenPositionY)

        this.threeCamera = this.threeCamera || this.camera.getObject3D('camera')

        this.internalState.raycaster.setFromCamera(screenPosition, this.threeCamera)
        const intersects = this.internalState.raycaster.intersectObject(this.ground.object3D, true)

        if (intersects.length > 0) {
          const intersect = intersects[0]
          this.internalState.distance = intersect.distance
          desiredPosition = intersect.point
        }
      }

      if (!desiredPosition) {
        desiredPosition = this.camera.object3D.localToWorld(new THREE.Vector3(0, 0, -this.internalState.distance))
      }

      desiredPosition.y = 1
      this.el.object3D.position.lerp(desiredPosition, 0.2)
    }
  },
  remove() {
    this.el.removeEventListener('mousedown', this.fingerDown)
    this.el.sceneEl.removeEventListener('onefingermove', this.fingerMove)
    this.el.sceneEl.removeEventListener('onefingerend', this.fingerUp)
    if (this.internalState.fingerDown) {
      this.fingerUp()
    }
  },
  fingerDown(event) {
    this.internalState.fingerDown = true
    this.internalState.startDragTimeout = setTimeout(this.startDrag, this.data.dragDelay)
    this.internalState.positionRaw = event.detail.positionRaw
  },
  startDrag(event) {
    if (!this.internalState.fingerDown) {
      return
    }
    this.internalState.dragging = true
    this.internalState.distance = this.el.object3D.position.distanceTo(this.camera.object3D.position)
    this.el.setAttribute('animation-mixer', {
      clip: 'Running',
      loop: 'repeat',
      crossFadeDuration: 0.4,
    })
  },
  fingerMove(event) {
    this.internalState.positionRaw = event.detail.positionRaw
  },
  fingerUp(event) {
    this.internalState.fingerDown = false
    clearTimeout(this.internalState.startDragTimeout)

    this.internalState.positionRaw = null

    if (this.internalState.dragging) {
      const endPosition = this.el.object3D.position.clone()
      this.el.setAttribute('animation__drop', {
        property: 'position',
        to: `${endPosition.x} 0 ${endPosition.z}`,
        dur: 300,
        easing: 'easeOutQuad',
      })
      this.el.setAttribute('animation-mixer', {
        clip: 'Idle',
        loop: 'repeat',
        crossFadeDuration: 0.4,
      })
    }
    this.internalState.dragging = false
  },
}

// Credit to elbobo: https://github.com/elbobo/aframe-gltf-morph-component
const gltfMorphComponent = {
  multiple: true,
  schema: {
    morphtarget: {type: 'string', default: ''},
    value: {type: 'number', default: 0},
  },
  init() {
    this.el.addEventListener('object3dset', () => {
      this.morpher()
    })
  },
  update() {
    this.morpher()
  },
  morpher() {
    const mesh = this.el.object3D
    mesh.traverse((o) => {
      if (o.morphTargetInfluences && o.userData.targetNames) {
        const pos = o.userData.targetNames.indexOf(this.data.morphtarget)
        o.morphTargetInfluences[pos] = this.data.value
      }
    })
  },
}

export {gltfMorphComponent, morphTargetDragComponent}
