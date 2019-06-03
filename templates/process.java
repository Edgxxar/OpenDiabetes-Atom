import de.opendiabetes.vault.data.container.VaultEntry;
import de.opendiabetes.vault.processing.*;
import java.util.ArrayList;
import java.util.List;

public class TEST implements ProcessingContainer {
    @Override
    public List<List<VaultEntry>> processData(List<List<VaultEntry>> inputData) {
        List<List<VaultEntry>> results = new ArrayList<>();

        for (List<VaultEntry> slice : inputData) {
            %FILTER%
        }

        return results;
    }
}
