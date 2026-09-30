    (function () {
      var oldEditorRows = editorRows;
      editorRows = function () {
        oldEditorRows();
        try {
          var body = document.getElementById('editRows');
          if (body && Array.isArray(equipes) && equipes.length === 0) {
            body.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:18px;color:#67707C;font-weight:950">Projeto sem equipes cadastradas. Use “Adicionar equipe” ou “Importar CSV” para iniciar a base deste contrato.</td></tr>';
          }
        } catch (e) { }
      };
      var oldOpenTeamCardSafe = openTeamCard;
      openTeamCard = function () {
        try { if (typeof window.ppHydrateEquipesFromBank === 'function') window.ppHydrateEquipesFromBank(); } catch (e) { }
        if (!Array.isArray(equipes) || equipes.length === 0) { alert('Este projeto ainda não possui equipes. Importe um CSV ou cadastre equipes no Editor do Projeto.'); return; }
        var _r = oldOpenTeamCardSafe();
        try { var _t = (typeof selectedCardTeam !== 'undefined') ? selectedCardTeam : ''; if (typeof window.ppSaveCardScreenState === 'function') window.ppSaveCardScreenState('teamCard', _t); } catch (e) { }
        return _r;
      };
      var oldOpenAllTeamCardsSafe = openAllTeamCards;
      openAllTeamCards = function () {
        try { if (typeof window.ppHydrateEquipesFromBank === 'function') window.ppHydrateEquipesFromBank(); } catch (e) { }
        if (!Array.isArray(equipes) || equipes.length === 0) { alert('Este projeto ainda não possui equipes. Importe um CSV ou cadastre equipes no Editor do Projeto.'); return; }
        var _r2 = oldOpenAllTeamCardsSafe();
        try { if (typeof window.ppSaveCardScreenState === 'function') window.ppSaveCardScreenState('allTeamCards', ''); } catch (e) { }
        return _r2;
      };
    })();
