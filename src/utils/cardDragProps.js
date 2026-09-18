export function buildCardDragProps(ctx, collectionName, itemId, isArmed, setArmedId) {
  return {
    cardProps: {
      draggable: isArmed,
      onDragStart: (event) => {
        event.dataTransfer.setData("text/plain", itemId);
        event.dataTransfer.effectAllowed = "move";
        ctx.handleCardDragStart(collectionName, itemId);
      },
      onDragOver: (event) => {
        event.preventDefault();
        ctx.handleCardDragOver(collectionName, itemId);
        event.currentTarget.classList.add("cms-card--drag-over");
      },
      onDragLeave: (event) => {
        event.currentTarget.classList.remove("cms-card--drag-over");
      },
      onDrop: (event) => {
        event.preventDefault();
        event.currentTarget.classList.remove("cms-card--drag-over");
        ctx.handleCardDrop(collectionName, itemId);
      },
      onDragEnd: (event) => {
        event.currentTarget.classList.remove("cms-card--drag-over");
        setArmedId(null);
        ctx.handleCardDragEnd();
      },
    },
    handleProps: {
      onMouseDown: () => setArmedId(itemId),
      onMouseUp: () => setArmedId(null),
    },
  };
}
