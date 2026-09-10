package api

import (
	"encoding/json"
	"sync"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/store"
)

const (
	wireViewerContractStateType = "viewer_contract_state"
	contractContentContract     = "contract"
	contractContentLeaderboard  = "leaderboard"
)

type viewerContractPresentationSnapshot struct {
	Type     string                  `json:"type"`
	Contract *viewerContractResponse `json:"contract"`
	Content  string                  `json:"content"`
	Visible  bool                    `json:"visible"`
}

type viewerContractPresentation struct {
	mu       sync.Mutex
	contract *viewerContractResponse
	content  string
	visible  bool
}

func newViewerContractPresentation(viewerStore *store.Store) (*viewerContractPresentation, error) {
	presentation := &viewerContractPresentation{content: contractContentContract}
	if viewerStore == nil {
		return presentation, nil
	}

	contract, err := viewerStore.CurrentViewerContract()
	if errors.Is(err, store.ErrViewerContractNotFound) {
		return presentation, nil
	}
	if err != nil {
		return nil, errors.Errorf("load active viewer contract presentation: %w", err)
	}
	presentation.contract = viewerContractFromStore(contract)
	presentation.visible = true
	return presentation, nil
}

func (p *viewerContractPresentation) Activate(contract *store.ViewerContract) viewerContractPresentationSnapshot {
	p.mu.Lock()
	defer p.mu.Unlock()

	p.contract = viewerContractFromStore(contract)
	p.content = contractContentContract
	p.visible = true
	return p.snapshotLocked()
}

func (p *viewerContractPresentation) Update(id, content string, visible bool) (viewerContractPresentationSnapshot, bool) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.contract == nil || p.contract.ID != id {
		return p.snapshotLocked(), false
	}
	p.content = content
	p.visible = visible
	return p.snapshotLocked(), true
}

func (p *viewerContractPresentation) SetVisible(visible bool) (viewerContractPresentationSnapshot, bool) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.contract == nil || p.visible == visible {
		return p.snapshotLocked(), false
	}
	p.visible = visible
	return p.snapshotLocked(), true
}

func (p *viewerContractPresentation) Clear(id string) viewerContractPresentationSnapshot {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.contract != nil && p.contract.ID == id {
		p.contract = nil
		p.content = contractContentContract
		p.visible = false
	}
	return p.snapshotLocked()
}

func (p *viewerContractPresentation) Current() viewerContractPresentationSnapshot {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.snapshotLocked()
}

func (p *viewerContractPresentation) snapshotLocked() viewerContractPresentationSnapshot {
	var contract *viewerContractResponse
	if p.contract != nil {
		contractCopy := *p.contract
		contract = &contractCopy
	}
	return viewerContractPresentationSnapshot{
		Type:     wireViewerContractStateType,
		Contract: contract,
		Content:  p.content,
		Visible:  p.visible,
	}
}

func viewerContractStateWirePayload(snapshot viewerContractPresentationSnapshot) ([]byte, error) {
	payload, err := json.Marshal(snapshot)
	if err != nil {
		return nil, errors.Errorf("marshal viewer contract state: %w", err)
	}
	return payload, nil
}
